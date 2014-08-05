/*
*   Library for shrinking images as much as possible to make them fit in a small flash mm in a uC
*   Arduino and the likes
*   author fredrik johansson mumme74 at github.com
*/
#ifndef EIMG_H
#define EIMG_H
#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>

//#define DISPLAY_COLOR_DEPTH 1 // for monochrome display
//#define DISPLAY_COLOR_DEPTH 8 // 256 color display
#define DISPLAY_COLOR_DEPTH 16 // 16bit color display (65536 colors)
//#define DISPLAY_COLOR_DEPTH 24 // 24bit color display


// this one should be set in user code, this is a template
#include "eimg_render_function.h"
//#define DRAW_PIXEL_FUNCTION(/*uint16_t*/x, /*uint16_t*/y, /*uint32_t*/color) drawPixel(x, y, color)

// template for UTFT
//#include <UTFT.h>
//#define DRAW_PIXEL_FUNCTION(/*uint16_t*/x, /*uint16_t*/y, /*uint16_t*/color) setColor(color); drawPixel(x, y)


 void eimg_draw(uint16_t startX, uint16_t startY, const uint8_t image[]);
#if DISPLAY_COLOR_DEPTH < 24
 void eimg_set_draw_pixel_function(void (*func)(int16_t x, int16_t y, uint16_t color));
#else
 void eimg_set_draw_pixel_function(void (*func)(int16_t x, int16_t y, uint32_t color));
#endif

#ifdef __cplusplus
}
#endif

#endif // EIMG_H
