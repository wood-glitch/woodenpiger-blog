<#
.SYNOPSIS
  把 Joplin 导出的 Markdown 转成 Hexo 文章（Butterfly 可直接用）。
.DESCRIPTION
  - 读 Joplin 导出的 YAML 头（title/created/updated/tags），丢掉经纬度等字段
  - created(UTC) -> 本地时间，作为 date
  - 标签里 cat/教程 这种前缀归到 categories，其余归 tags
  - 自动过滤被误存成标签的残缺 front matter
  - 把本地绝对路径图片 (...\source\images\xxx.png) 改写成 /images/xxx.png
  - 若正文开头自带 Hexo 头（--- 且含 title:），优先用它
.EXAMPLE
  pwsh -File tools/joplin2hexo.ps1 -Path 'D:\export\无标题.md' -Category 随笔
.EXAMPLE
  pwsh -File tools/joplin2hexo.ps1 -Path 'D:\export' -OutDir source/_posts -Category 随笔 -Tags OpenCode
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Path,
  [string]$OutDir = 'source/_posts',
  [string]$Category = '',
  [string[]]$Tags = @(),
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$root = (Get-Location).Path
$outRoot = if ([System.IO.Path]::IsPathRooted($OutDir)) { $OutDir } else { Join-Path $root $OutDir }

function Split-FrontMatter {
  param([string]$Text)
  $t = $Text -replace "`r`n", "`n"
  if ($t -notmatch '^(?:\uFEFF)?---\n') { return @{ Head = ''; Body = $t } }
  $end = $t.IndexOf("`n---", 4)
  if ($end -lt 0) { return @{ Head = ''; Body = $t } }
  $head = $t.Substring(4, $end - 4)
  $bodyStart = $t.IndexOf("`n", $end + 4)
  if ($bodyStart -lt 0) { $bodyStart = $t.Length }
  return @{ Head = $head; Body = $t.Substring($bodyStart).TrimStart("`n") }
}

function Read-YamlPairs {
  param([string]$Head)
  $map = [ordered]@{}
  $currentKey = $null
  foreach ($line in ($Head -split "`n")) {
    if ($line -match '^\s*#' -or $line.Trim() -eq '') { continue }
    if ($line -match '^([A-Za-z_][\w\-]*):\s*(.*)$') {
      $currentKey = $Matches[1]
      $val = $Matches[2].Trim()
      if ($val -eq '') { $map[$currentKey] = @() }
      else { $map[$currentKey] = @($val.Trim("'", '"')) }
      continue
    }
    if ($line -match '^\s*-\s*(.*)$' -and $currentKey) {
      $item = $Matches[1].Trim().Trim("'", '"')
      $map[$currentKey] = @($map[$currentKey]) + $item
    }
  }
  return $map
}

function ConvertTo-HexoDate {
  param([string]$Raw)
  if (-not $Raw) { return (Get-Date).ToString('yyyy-MM-dd HH:mm:ss') }
  try {
    $dto = [datetimeoffset]::Parse($Raw, [Globalization.CultureInfo]::InvariantCulture)
    return $dto.ToLocalTime().ToString('yyyy-MM-dd HH:mm:ss')
  } catch {
    return (Get-Date).ToString('yyyy-MM-dd HH:mm:ss')
  }
}

function Repair-Images {
  param([string]$Body)
  # ("C:\...\source\images\xxx.png")  ->  ![](/images/xxx.png)
  $Body = [regex]::Replace($Body, '\("?(?:file:///)?[^"()]*?images[\\/]+([^"\\/()]+?\.(?:png|jpe?g|gif|webp|svg))"?\)',
    { param($m) '![](' + '/images/' + $m.Groups[1].Value + ')' }, 'IgnoreCase')
  # ![alt](C:\...\images\xxx.png) -> ![alt](/images/xxx.png)
  $Body = [regex]::Replace($Body, '(!\[[^\]]*\]\()(?:file:///)?[^)\s]*?images[\\/]+([^)\s]+?)(\))',
    { param($m) $m.Groups[1].Value + '/images/' + $m.Groups[2].Value + $m.Groups[3].Value }, 'IgnoreCase')
  return $Body
}

function Convert-One {
  param([System.IO.FileInfo]$File)

  $raw = [System.IO.File]::ReadAllText($File.FullName, [Text.Encoding]::UTF8)
  $first = Split-FrontMatter -Text $raw
  $meta = Read-YamlPairs -Head $first.Head
  $body = Repair-Images -Body $first.Body

  $unresolved = [regex]::Matches($body, '!\[[^\]]*\]\(:/[A-Za-z0-9]+')
  if ($unresolved.Count -gt 0) {
    Write-Warning "$($File.Name): $($unresolved.Count) 个 Joplin 资源链接 (:/id) 无法自动解析，需手工换成 /images/xxx.png"
  }

  $hexoHead = $null
  if ($body -match '^(?:\uFEFF)?---\n') {
    $second = Split-FrontMatter -Text $body
    if ($second.Head -match '(?m)^title:') {
      $hexoHead = $second.Head
      $body = $second.Body
    }
  }

  $title = $File.BaseName
  if ($meta['title'] -and $meta['title'].Count -gt 0) { $title = $meta['title'][0] }

  if ($hexoHead) {
    $fm = @('---', $hexoHead.Trim("`n"), '---', '')
  } else {
    $date = ConvertTo-HexoDate -Raw ($meta['created'] | Select-Object -First 1)
    $updated = ConvertTo-HexoDate -Raw ($meta['updated'] | Select-Object -First 1)

    $cats = New-Object System.Collections.Generic.List[string]
    $tags = New-Object System.Collections.Generic.List[string]
    if ($Category) { $cats.Add($Category) }
    foreach ($t in @($Tags)) { if ($t) { $tags.Add($t) } }
    foreach ($t in @($meta['tags'])) {
      if (-not $t) { continue }
      if ($t -match '^---') { continue }                       # 误存成标签的残缺 front matter
      if ($t -match '(?i)title:\s*categories:') { continue }
      if ($t -match '^(?:cat|category|categories)[/\\:](.+)$') { $cats.Add($Matches[1].Trim()) }
      else { $tags.Add($t.Trim()) }
    }

    $lines = @('---')
    $lines += "title: $title"
    $lines += "date: $date"
    $lines += "updated: $updated"
    if ($tags.Count -gt 0) {
      $lines += 'tags:'
      foreach ($t in ($tags | Select-Object -Unique)) { $lines += "  - $t" }
    }
    if ($cats.Count -gt 0) {
      $lines += 'categories:'
      foreach ($c in ($cats | Select-Object -Unique)) { $lines += "  - $c" }
    }
    $lines += '---'
    $fm = $lines + ''
  }

  $text = (($fm -join "`n") + "`n" + $body.TrimStart()) -replace "`r`n", "`n"
  $safe = ($title -replace '[\\/:*?"<>|]', '-' -replace '\s+', ' ').Trim()
  $target = Join-Path $outRoot ($safe + '.md')

  if ($DryRun) {
    Write-Output "=== $($File.Name) -> $target"
    ($text -split "`n" | Select-Object -First 20) -join "`n"
  } else {
    if (-not (Test-Path -LiteralPath $outRoot)) { New-Item -ItemType Directory -Path $outRoot -Force | Out-Null }
    [System.IO.File]::WriteAllText($target, $text, (New-Object System.Text.UTF8Encoding($false)))
    Write-Output "OK  $($File.FullName) -> $target"
  }
}

$files = if (Test-Path -LiteralPath $Path -PathType Container) {
  Get-ChildItem -LiteralPath $Path -Filter *.md -File | Where-Object { $_.Name -ne 'README.md' }
} else {
  Get-Item -LiteralPath $Path
}
foreach ($f in $files) { Convert-One -File $f }