# Corrected PowerShell Script to generate gorgeous premium "PN" icons for PioneersMsg
Add-Type -AssemblyName System.Drawing

$workspace = "c:\Users\OWNER\Downloads\Alpha\Some Projects\Doxish\Projeler\PioneersMsg"
$iconsDir = Join-Path $workspace "icons"

if (!(Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

$sizes = @(16, 48, 128)
foreach ($size in $sizes) {
    # Create Bitmap
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # High-quality rendering settings
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # Dimensions
    $margin = [float]($size * 0.02)
    $x = [float]$margin
    $y = [float]$margin
    $w = [float]($size - (2 * $margin))
    $h = [float]($size - (2 * $margin))
    
    # 1. Background circle (dark premium UI matching background)
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 8, 12, 20))
    $g.FillEllipse($bgBrush, $x, $y, $w, $h)
    
    # 2. Glowing accent circular border (Peach/Orange)
    $borderWidth = [float]([Math]::Max(1.0, ($size * 0.06)))
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 251, 146, 60), $borderWidth)
    $g.DrawEllipse($borderPen, $x, $y, $w, $h)
    
    # 3. Font and text positioning
    # Bold, modern sans-serif font
    $fontSize = [float]($size * 0.44)
    $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    
    # Measure characters
    $sizeP = $g.MeasureString("P", $font)
    $sizeN = $g.MeasureString("N", $font)
    
    # Kerning overlap factor
    $kerning = [float]($size * 0.08)
    $totalWidth = [float]($sizeP.Width + $sizeN.Width - $kerning)
    
    $startX = [float](($size - $totalWidth) / 2 - ($size * 0.02))
    $startY = [float](($size - $sizeP.Height) / 2 + ($size * 0.02))
    
    # Draw "P" in white
    $pBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
    $g.DrawString("P", $font, $pBrush, $startX, $startY)
    
    # Draw "N" in vibrant Malatya orange
    $nBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 251, 146, 60))
    $g.DrawString("N", $font, $nBrush, [float]($startX + $sizeP.Width - $kerning), $startY)
    
    # Save image
    $outputPath = Join-Path $iconsDir "icon-$size.png"
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Dispose resources
    $pBrush.Dispose()
    $nBrush.Dispose()
    $bgBrush.Dispose()
    $borderPen.Dispose()
    $font.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    
    Write-Host "Generated icon-$size.png successfully."
}
