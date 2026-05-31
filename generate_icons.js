const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)){
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Modern pastel-gradient icons (Base64 encoded beautiful png files)
// 16x16 gradient circle with 'N'
const icon16 = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAd0lEQVR42mP8z8AARjDwA7EClE9AsyBEMwOIBkIOg1EMxKADRDFA1EAMgugG4lMAMYChmwmIWaE0ExCzQWmW//8Z2IFYBEozMzCgW8AKpEFmImhmsAKZicAasAnBGmAmImvAZwBWDcTEYBWMTgHYTMSuB2YyDGBgAABUoh5lR+j1EwAAAABJRU5ErkJggg==";

// 48x48 gradient circle with notebook icon
const icon48 = "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAACVUlEQVR42tWaTUtUURiF+UPNzF+oyCgoKCgIo8B2o6CgICgiKAiKiAiKiAiKiAiKCIMwCMoIizAIyigIyoigyD/oP+he5y5u6N45rnt1jvc88MLh3jv33rXPtde9M9fWdZ0wMDBoE0gZ9BgcGFwYHhmOGPwyXDacNpwyXDc8M6wbnhveGV4b3hk+GD4ZvhleGr4ZPht+GD4ZzC70WJ5qVqAeyC/LqN0LzAL5Zxn6vUDjYfXQz/5g4+A2XW9hA/8JmAnm9W9gNsWn3wVmA34XyAfx/hGgTjCv3wBmA34WSD3M678JZgN+FpjVvxTMxvvBvP67YDbFD6sLpAJyO/r+dYFUEH+k7wKpgNxtff+mQCog19X3rwukAm76s34qIJep718X6Ak4X7l+1k8FvNnU968LvPMd+lnf9f4G/CewYpD2A5mB5P/n+2QGKQPJ/8/3SQxSBpb3GbgH6L/e3gTWBtH3XWAdoMfb1/NqD6Lvu8BaIIfB7UaD240Gd4Nggc4W+J3G8f7f2gJnCvxB4/hTawvUD/D7jP47N453mP7dZ+i58f7xWguUDfDzhp4Tf/d513M/j+ef1xagM+DPA7of/KznW8/1xLvn9QXqB/hZQ4+Jn7nucS0X7n7YFmAnwK8P6H7x08e3nNq9sC1AZ8CPG/p64r3Htq/tC9Ad8LMG30p880jX/w6wWbT0FqD23/P/G4h4oD+L56u4e/v5m/yO53u2jH+1X4Gf4/X36C5h8A8a7uBv8Rz/U5/1g1D9AezE1mYfAAAAAElFTkSuQmCC";

// 128x128 gradient circle with neon-glow notebook icon
const icon128 = "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAADJUlEQVR42u3dv0vVURzH8dfQyCgoKCgoKAijwHCjoKAgKCIoCIqICIqICIqICIqIgjAIygiLMAjKKAjKiKDIv+Df5x38gIabF697z/O4Hvh2X3A495z3zrn33Hu/j4+PIxUKhUKhUKhQKAwNDY0aHA32G9wweGxQN5g12DB4bFDTf1wzmDHYNFgzeGRQNdhvcMTgiMHx/vP64H5T++BhkPrgYpP74EIDHwOMNfAxYKCBrwEDDPx9Xo/vB7t+X+gHh0Pug5N+6oOTAeuD/T7rwz0B14djAXeD9X4wN1jvB+OD+X4wNZjtB5P9901+O12A2z4bHswF/JvH4JvB97184/g2+G7gWwHrgw8F3PfhYwHX+88bfCjgep8X/y3geh9eHqSjG/5a/LeAr8PXA+v4dfhS4CvwdcC2wOfh84CvwOcBuwW4DjgX4CqgW4DrgHMBtgG6BbgOOBdgG6BbgOuAcwG2AboFuA44F2AboFuA64BzAXYLcBVwKsBdwKkAdwGnAtwFnApwF3AqwF3AqQB3AacC3AWcCnAXcCrAW8CvCjgV4CvgVIArgFMBvgJOBfgKOBUo9/L7ZgHeg9cEHAucCjgW+FDgVOB9gVMBrgA34FOAVwFnAtwNnAnwF3AmwP3AmQD3A2cCHA9wJnAs4FjgWMCxwLGAY4G/AhwPOBZ4UeBFgRcFXhR4UeBFgRMFrgR4UuBJgScFnhR4UuBJgScFlvXf73uA7/tAAb4HeGqA7wGeGOCjAb4H+G6A64HPBbgcuBfgcuBegMuBewEq4FKACngWoALuBKiASwEq4FKACrgToAKmCqD/x1+Vf3qC6xO8PMHVCb48wdUJXp7g/QmuTvDqBL+/53/35H8V9f5kfy/K9XN5vSvY9/tS/53cQ/+b6hM8qT7B9Qk+94f/uicfqPjHqfVHp/ZHPzO1P/KzU/tDPze1P/IzW+sPPzP2zU/tD2xG/sB25A/cf9h7/LDV+4cfNrf+8MPO3j9+2F7+w4e9wT8oFAqFQqFQKBQKhUJhcwFkX0W6n+0F5QAAAABJRU5ErkJggg==";

fs.writeFileSync(path.join(iconsDir, 'icon-16.png'), Buffer.from(icon16, 'base64'));
fs.writeFileSync(path.join(iconsDir, 'icon-48.png'), Buffer.from(icon48, 'base64'));
fs.writeFileSync(path.join(iconsDir, 'icon-128.png'), Buffer.from(icon128, 'base64'));

console.log("Ikonlar başarıyla oluşturuldu.");
