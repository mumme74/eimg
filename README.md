eimg
====

A tool that compresses images to small enough size to fit in microcontroller flash memory

It creates a c char array that you cant include in your embedded project
Like Icon images on buttons and the like


It needs a Library in C to decompress it

It works by using a color map and reducing color count. also transparent pixels only take up on bit of Flash ROM

See separate repository for a Arduino library (currently only tested on Teensy)

Usage:
1. Drag and drop a image onto the page or paste it to the file container

2. Select the added picture

3. Select the colordepth of your embedded applications screen and the desired colordepth of your picture (the fewer colors the smaller image)

4. If picture doesnt look good enough try the different dithering settings

5. When your done click <b>get code</b> link, a dialog opens that you can copy from and paste into your C header file
 

Thanks to https://github.com/leeoniya/RgbQuant.js for doing the color reduction and dithering code.


