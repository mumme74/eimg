eimg
====

A tool that compresses images to small enough size to fit in microcontroller flash memory

It creates a C char array that you can include in your embedded project
Like Icon images on buttons and the like

![alt tag](https://raw.githubusercontent.com/mumme74/eimg/master/doc/initial.png)

It needs a Library in C to decompress it

It works by using a color map and reducing color count. also transparent pixels only take up on bit of Flash ROM

See separate repository for a Arduino library (currently only tested on Teensy)

<b>NOTE!</b>
You must use a modern html5 browser, such as google chrome.

Usage:
1. Open index.html in your browser, you dont have to have a webserver for it to run, although a simple python server is in the sources

2. Drag and drop a image onto the page or paste it to the file container
![alt tag](https://raw.githubusercontent.com/mumme74/eimg/master/doc/ondrop.png)

3. Select the added picture
![alt tag](https://raw.githubusercontent.com/mumme74/eimg/master/doc/afterdrop.png)

4. Select the colordepth of your embedded applications screen and the desired colordepth of your picture (the fewer colors the smaller image)
![alt tag](https://raw.githubusercontent.com/mumme74/eimg/master/doc/aftercompress.png)

   Compressedd to only 2 colors (58bytes instead of 81)
![alt tag](https://raw.githubusercontent.com/mumme74/eimg/master/doc/compressed_2colors.png)


5. If picture doesnt look good enough try the different dithering settings

6. When your done click <b>get code</b> link, a dialog opens that you can copy from and paste into your C header file
![alt tag](https://raw.githubusercontent.com/mumme74/eimg/master/doc/C_array.png)
 

Thanks to https://github.com/leeoniya/RgbQuant.js for doing the color reduction and dithering code,
and to http://filedropjs.org/.


