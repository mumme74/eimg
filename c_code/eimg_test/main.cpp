#include <QtGui/QApplication>
#include "eimgdisplayer.h"
#include "eimg_render_function.h"
#include "eimg.h"

#if DISPLAY_COLOR_DEPTH == 1
#include "images1bit.h"
#elif DISPLAY_COLOR_DEPTH == 8
#include "images8bits.h"
#elif DISPLAY_COLOR_DEPTH == 16
#include "images16bits.h"
#elif DISPLAY_COLOR_DEPTH == 24
#include "images24bits.h"
#endif

int main(int argc, char *argv[])
{
    QApplication a(argc, argv);
    eimg_set_draw_pixel_function(&drawPixel);
    eimg_draw(0,0, billyft_png);
    eimg_draw(30,40, down_png);
    eimg_draw(10,0,carrot_png);


    EImgDisplayer w;
    w.show();
    
    return a.exec();
}
