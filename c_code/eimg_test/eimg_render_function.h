#ifndef EIMG_RENDER_FUNCTION_H
#define EIMG_RENDER_FUNCTION_H
//#define DISPLAY_COLOR_DEPTH 1 // for monochrome display
//#define DISPLAY_COLOR_DEPTH 8 // 256 color display
//#define DISPLAY_COLOR_DEPTH 16 // 16bit color display (65536 colors)
//#define DISPLAY_COLOR_DEPTH 24 // 24bit color display

#include "eimg.h"
#ifdef __cplusplus
extern "C" {
#endif

#if DISPLAY_COLOR_DEPTH < 24
void drawPixel(int16_t x, int16_t y, uint16_t color);
#else
void drawPixel(int16_t x, int16_t y, uint32_t color);
#endif

#ifdef __cplusplus
}
#endif
#endif
