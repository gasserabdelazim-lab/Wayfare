Add-Type -AssemblyName System.Drawing
$brandRoot = Split-Path $PSScriptRoot -Parent
$brandTargets = @(@('app/icon.png',512), @('app/apple-icon.png',180), @('public/icon-192x192.png',192), @('public/icon-512x512.png',512))
foreach ($brandTarget in $brandTargets) {
  $brandSize = [int]$brandTarget[1]
  $bitmap = New-Object System.Drawing.Bitmap($brandSize,$brandSize)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f1f3ef'))
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $font = New-Object System.Drawing.Font('Arial',($brandSize * 0.12),[System.Drawing.FontStyle]::Bold,[System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#216557'))
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rectangle = New-Object System.Drawing.RectangleF(0,0,$brandSize,$brandSize)
  $graphics.DrawString('PALVOYA',$font,$brush,$rectangle,$format)
  $bitmap.Save((Join-Path $brandRoot $brandTarget[0]),[System.Drawing.Imaging.ImageFormat]::Png)
  $format.Dispose(); $brush.Dispose(); $font.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
