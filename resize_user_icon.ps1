# PowerShell script to resize the user's high-quality PN logo image into the extension icons
Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\OWNER\.gemini\antigravity-ide\brain\57dc4614-c295-4fd4-b19d-235586ce5d3d\media__1780172374260.png"
$workspace = "c:\Users\OWNER\Downloads\Alpha\Some Projects\Doxish\Projeler\PioneersMsg"
$iconsDir = Join-Path $workspace "icons"

if (!(Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

if (Test-Path $sourcePath) {
    Write-Host "Found source image: $sourcePath"
    
    # Load original image
    $originalBmp = [System.Drawing.Image]::FromFile($sourcePath)
    
    $sizes = @(16, 48, 128)
    foreach ($size in $sizes) {
        $resizedBmp = New-Object System.Drawing.Bitmap($size, $size)
        $g = [System.Drawing.Graphics]::FromImage($resizedBmp)
        
        # High quality settings for sharp rendering
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        
        # Draw the original image resized
        $g.DrawImage($originalBmp, 0, 0, $size, $size)
        
        # Save output as PNG
        $outputPath = Join-Path $iconsDir "icon-$size.png"
        $resizedBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $g.Dispose()
        $resizedBmp.Dispose()
        Write-Host "Created icon-$size.png from source successfully."
    }
    
    $originalBmp.Dispose()
    Write-Host "All icons resized successfully."
} else {
    Write-Error "Could not find the uploaded image at $sourcePath"
}
