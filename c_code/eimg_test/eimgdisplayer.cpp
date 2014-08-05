#include "eimgdisplayer.h"
#include "eimg_render_function.h"
#include "eimg.h"
#include <QImage>
#include <QMap>
#include <QDebug>
#include <bitset>
#include <iostream>

static QMap<int, QMap<int, uint32_t> > pixels;
int16_t maxX = 0;
int16_t maxY = 0;
int16_t minX = -1;
int16_t minY = -1;
uint8_t displayColorDepth;

#if DISPLAY_COLOR_DEPTH < 24
void drawPixel(int16_t x, int16_t y, uint16_t color){
#else
void drawPixel(int16_t x, int16_t y, uint32_t color){
#endif
    std::cout <<std::dec << "x:" << x << " y:" << y << " color:" << std::bitset<16>(color) << "  " <<std::hex<< color << std::endl;
    pixels[y][x] = color;
    maxX = qMax(maxX, x);
    maxY = qMax(maxY, y);

    if (minX < 0)
        minX = x;
    else
        minX = qMin(minX, x);

    if (minY < 0)
        minY = y;
    else
        minY = qMin(minY, y);
}


#if DISPLAY_COLOR_DEPTH == 1
QRgb convertColor(uint32_t color){
    uint8_t r,g,b;
    // this is a special case as white color should be rendered transparent
    r = g = b = 0; // all black color
    return QColor(0,0,0, color ? 0xFF : 0).rgba();
}

#elif DISPLAY_COLOR_DEPTH == 8
QRgb convertColor(uint32_t color){
    uint8_t r, g, b;
    r = (color & 0xE0) >> 5;
    g = (color & 0x1C) >> 2;
    b = color & 0x03;
    r = (r * 255 / 7);
    g = (g * 255 / 7);
    b = (b * 255 / 3);
    return QColor(r,g,b,0xFF).rgba();
}

#elif DISPLAY_COLOR_DEPTH == 16
QRgb convertColor(uint32_t color){
    uint8_t r, g, b;
    r = (color & 0xF800) >> 11;
    g = (color & 0x07E0) >> 5;
    b = (color & 0x001F);
    r = (r * 255 / 31);
    g = (g * 255 / 63);
    b = (b * 255 / 31);
    return QColor(r,g,b,0xFF).rgba();
}

#elif DISPLAY_COLOR_DEPTH == 24
QRgb convertColor(uint32_t color) {
    uint8_t r, g, b;
    r = (color & 0xFF0000) >> 16;
    g = (color & 0x00FF00) >> 8;
    b = color & 0x0000FF;
    return QColor(r,g,b,0xFF).rgba();
}

#endif

EImgDisplayer::EImgDisplayer(QWidget *parent)
    : QLabel(parent)
{
    int width = maxX;
    int height = maxY;
    setFixedSize(width + 20, height + 20);

    QImage img(minX + width + 3, minY + height + 3, QImage::Format_ARGB32);
    //img.fill(Qt::white);


    for(int y = 0; y <= height; ++y){
        for(int x = 0; x <= width;++x){
            uint32_t color;
            QRgb c;
            if (pixels.contains(y) && pixels[y].contains(x)){
                color = pixels[y][x];
                c = convertColor(color);
            } else {
                c = QColor(0,0,0,0).rgba();
            }
            img.setPixel(x+1, y+1, c);
        }
    }


    QPainter qPainter(&img);
    qPainter.setBrush(Qt::NoBrush);
    qPainter.setPen(Qt::red);
    qPainter.drawRect((uint16_t)minX, (uint16_t)minY, width - (uint16_t)minX + 2, height - (uint16_t)minY + 2);
    qPainter.end();


    setPixmap(QPixmap::fromImage(img));

}

EImgDisplayer::~EImgDisplayer()
{
    
}
