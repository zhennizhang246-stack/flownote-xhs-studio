$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" }
if (!(Test-Path -LiteralPath $nodePath)) { throw "未找到 Node.js，请先安装 Node.js 22 或更高版本" }
& $nodePath server.mjs
