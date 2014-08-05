
#include "eimg.h"
#include <assert.h>



#if DISPLAY_COLOR_DEPTH < 24
 void (*pDrawPixel)(int16_t x, int16_t y, uint16_t color);
 void eimg_set_draw_pixel_function(void (*func)(int16_t x, int16_t y, uint16_t color)){
     pDrawPixel = func;
 }

#else
 void (*pDrawPixel)(int16_t x, int16_t y, uint32_t color);
 void eimg_set_draw_pixel_function(void (*func)(int16_t x, int16_t y, uint32_t color)){
     pDrawPixel = func;
 }
#endif


#if DISPLAY_COLOR_DEPTH == 1
    inline
    uint8_t getColor(const uint8_t byteStream[], unsigned int colorMapStarts, unsigned int colorMapIdx){
        if (byteStream[colorMapStarts] & (1 << (7 - colorMapIdx)))
            return 0; // pixel on = black color
        return 1; // white color
    }
#elif DISPLAY_COLOR_DEPTH == 8
    inline
    uint8_t getColor(const uint8_t byteStream[], unsigned int colorMapStarts, unsigned int colorMapIdx){
        return byteStream[colorMapStarts + colorMapIdx];
    }
#elif DISPLAY_COLOR_DEPTH == 16
    inline
    uint16_t getColor(const uint8_t byteStream[], unsigned int colorMapStarts, unsigned int colorMapIdx){
        unsigned int pos = colorMapStarts + (colorMapIdx * 2);
        return (byteStream[pos] << 8) | byteStream[pos + 1];
    }
#elif DISPLAY_COLOR_DEPTH == 24
    inline
    uint32_t getColor(const uint8_t byteStream[], unsigned int colorMapStarts, unsigned int colorMapIdx){
        unsigned int pos = colorMapStarts + (colorMapIdx * 3);
        return (byteStream[pos] << 16) | (byteStream[pos+1] << 8) | byteStream[pos+2];
    }
#else
#error "DISPLAY_COLOR_DEPTH is unknown"
#endif

// dont rely on math.h pow function, it makes build huge
uint32_t eimg_pow(uint16_t base, uint16_t exp)
{
    uint32_t result = 1;
    while (exp)
    {
        if (exp & 1)
            result *= base;
        exp >>= 1;
        base *= base;
    }
    return result;
}


void eimg_draw(uint16_t startX, uint16_t startY, const uint8_t image[]){

    static const uint8_t IS_EXTENDED_META       = 0x80; // 0b1000 0000
    static const uint8_t IS_TRANSPARENT         = 0x40; // 0b0100 0000
    static const uint8_t EXTENDED_COLOR_DEPTH   = 0x3C; // 0b0011 1100
    static const uint8_t SHORT_COLOR_DEPTH      = 0x38; // 0b0011 1000

    uint16_t colorTableSize, pos, nextPos, width, height;
    uint32_t bytesPos = 0;
    uint8_t meta_b1, colorDepth, byte;
    unsigned int colorMapStart, test, maxColors, colorIdx, bitPos, colorMask; // use most efficient type of int
    bytesPos = 0;
    meta_b1 = image[bytesPos++];
    width = 1;
    height = 1;
    colorDepth = 1;


    if (meta_b1 & IS_EXTENDED_META){
        colorDepth = (meta_b1 & EXTENDED_COLOR_DEPTH) >> 2; // 2 reserved bits
        width = (image[bytesPos] << 4) | (image[bytesPos + 1] & 0xF0) >> 4;// b2->0b1111 1111 + b3->0b1111 0000
        height = ((image[bytesPos + 1] & 0x0F) << 8) | image[bytesPos + 2];  // b3->0b0000 1111 + b4->0b1111 1111
        bytesPos = 4;
    } else {
        colorDepth = (meta_b1 & SHORT_COLOR_DEPTH) >> 3; // 3 bits shifted
        width = ((meta_b1 & 0x03) << 3) | ((image[bytesPos] & 0xE0) >> 5); // b1->0b0000 0011 + b2->0b1110 0000
        height = image[bytesPos++] & 0x1F; 						 // b2->0b0001 1111
        width += 1; // 0 = 1 pixel saves some space assuming nobody has a picture of 0 pixels :)
        height += 1;
    }
    // done with meta header

    // ------------ start read color table size ------------
    // start reading in number of entries in the colorTable (might be less than what is set as max in meta)
    colorTableSize = 0;

    // read the stream length, it should be here just before the colors
    // first find the stop byte for this segment (bit[0] = 0)

    pos = bytesPos;
    do {
        byte = image[pos++];
    }while(byte & 1);
    nextPos = pos;

    // read it into variable, little end last
    bitPos = 0;
    do { // continue as long as last bit is 1, size ends with 0 on last byte
        // NOTE in C we might use union here with uint32 and uchar[4] to speed up?
        byte = image[--pos];
        colorTableSize |= ((byte & 0xFE) >> 1) << bitPos;
        bitPos += 7;
    } while(pos > bytesPos);

    bytesPos = nextPos;
    // ------------ end color table size --------------


    // ---------- color table start and finish -----------
    colorMapStart = bytesPos;
    //var pixelStart = bytesPos + colorTableSize;


    // ---------- start render pixels ----------------
    bytesPos = bytesPos + colorTableSize; //pixelStart;

    if (!colorDepth) colorDepth = 1; // monocrome?

    // find out haw many bit there is in colorDepth
    test = eimg_pow(2, colorDepth) -1;

    colorMask = 0;
    while(test > 0){
        colorMask = (colorMask << 1) | 1;
        test >>= 1;
    }
    colorMask <<= 23 - colorDepth;

    // render pixels
    maxColors = eimg_pow(2, colorDepth);
    colorIdx = 0;

    if (meta_b1 & IS_TRANSPARENT){
        uint32_t ui24, pMask, cMask, p, end;
        uint16_t x, y;

        if (!colorDepth) colorDepth = 1; // monocrome?

        ui24 = 0, pMask = 1 << 15, bitPos = 15, cMask; // = colorMask << (15 - colorDepth);
        for(p = 0, end = width * height; p < end; /*change in code*/){
            ui24 = (image[bytesPos] << 16);
            ui24 |= (image[bytesPos +1] << 8);
            ui24 |= image[bytesPos +2]; // we load one byte at a time swaping low for higher byte
            ++bytesPos;
            pMask <<= 8;
            bitPos += 8;
            //cMask <<= 8;
            while(bitPos > 15 && p < end){
                if(pMask & ui24){
                    // a visible pixel lookup color
                    cMask = colorMask >> (23 - bitPos);
                    bitPos -= colorDepth;
                    colorIdx = (ui24 & cMask) >> bitPos;
                    pMask >>= colorDepth;
                    //cMask >>= colorDepth;

                    assert(colorIdx <= maxColors);

                    // render it
                    y = p / width;
                    x = p - (y * width);
                    pDrawPixel(x + startX, y + startY,  getColor(image, colorMapStart, colorIdx));
                }
                pMask >>= 1;
                //cMask >>= 1;
                --bitPos;
                ++p; // increment pixels
            }
        }

    } else {
        uint32_t ui24, cMask, p, end;
        uint16_t x, y;
        ui24 = 0, bitPos = 15, cMask;// = (colorMask <<  (16 - colorDepth));
        for(p = 0, x, y, end = width * height; p < end; /*in code*/){
            ui24  = image[bytesPos] << 16;
            ui24 |= image[bytesPos +1] << 8;
            ui24 |= image[bytesPos +2];
            ++bytesPos;
            bitPos += 8;
            cMask <<= 8;
            while(bitPos > 15 && p < end){
                cMask = colorMask >> (23 - bitPos);
                bitPos -= colorDepth;
                colorIdx = (ui24 & cMask) >> (bitPos +1);
               // cMask >>= colorDepth;

                assert(colorIdx <= maxColors);

                // render it
                y = p / width;
                x = p - (y * width);
                pDrawPixel(x + startX, y + startY,  getColor(image, colorMapStart, colorIdx));
                ++p;
            }
        }
    }
}


