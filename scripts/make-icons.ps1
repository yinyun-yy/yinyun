Add-Type -AssemblyName System.Drawing

function New-FrogIcon([int]$size, [string]$out) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  $u = $size / 512.0

  function Ellipse($brush, $x, $y, $w, $h) {
    $g.FillEllipse($brush, $x, $y, $w, $h)
  }

  $body = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 207, 63))
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddBezier((100 * $u), (110 * $u), (70 * $u), (160 * $u), (60 * $u), (260 * $u), (95 * $u), (330 * $u))
  $path.AddBezier((95 * $u), (330 * $u), (120 * $u), (395 * $u), (200 * $u), (430 * $u), (256 * $u), (430 * $u))
  $path.AddBezier((256 * $u), (430 * $u), (312 * $u), (430 * $u), (392 * $u), (395 * $u), (417 * $u), (330 * $u))
  $path.AddBezier((417 * $u), (330 * $u), (452 * $u), (260 * $u), (442 * $u), (160 * $u), (412 * $u), (110 * $u))
  $path.AddBezier((412 * $u), (110 * $u), (400 * $u), (78 * $u), (112 * $u), (78 * $u), (100 * $u), (110 * $u))
  $path.CloseFigure()
  $g.FillPath($body, $path)
  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 190, 140, 40), (8 * $u))
  $g.DrawPath($pen, $path)

  $belly = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 251, 232))
  Ellipse $belly (140 * $u) (255 * $u) (232 * $u) (150 * $u)

  $eyeW = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  Ellipse $eyeW (105 * $u) (110 * $u) (150 * $u) (150 * $u)
  Ellipse $eyeW (257 * $u) (110 * $u) (150 * $u) (150 * $u)
  $eyePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 140, 100, 30), (6 * $u))
  $g.DrawEllipse($eyePen, (105 * $u), (110 * $u), (150 * $u), (150 * $u))
  $g.DrawEllipse($eyePen, (257 * $u), (110 * $u), (150 * $u), (150 * $u))

  $pupil = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 43, 36, 22))
  Ellipse $pupil (168 * $u) (170 * $u) (58 * $u) (58 * $u)
  Ellipse $pupil (286 * $u) (170 * $u) (58 * $u) (58 * $u)

  $hi = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  Ellipse $hi (184 * $u) (180 * $u) (20 * $u) (20 * $u)
  Ellipse $hi (302 * $u) (180 * $u) (20 * $u) (20 * $u)

  $cheek = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(140, 255, 140, 110))
  Ellipse $cheek (82 * $u) (240 * $u) (60 * $u) (40 * $u)
  Ellipse $cheek (370 * $u) (240 * $u) (60 * $u) (40 * $u)

  $mPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 163, 114, 46), (10 * $u))
  $mPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $mPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawArc($mPen, (205 * $u), (215 * $u), (110 * $u), (70 * $u), 20, 140)

  $g.Dispose()
  $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "saved $out"
}

New-FrogIcon 192 "D:\naifen-tuntun\icons\icon-192.png"
New-FrogIcon 512 "D:\naifen-tuntun\icons\icon-512.png"
New-FrogIcon 180 "D:\naifen-tuntun\icons\apple-touch-icon.png"
