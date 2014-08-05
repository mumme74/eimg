

function CanvasCls(canvas, imgLoader) {
  
  var _t = this;
  
  this._displayColorDepth = 16;
  this._colorDepth = 8;
  this._isAlpha = false;
  
  var alphaThreshold = 128;
	
  var transpNode = document.createElement("canvas");
  canvas.parentNode.insertBefore(transpNode, canvas);
  transpNode.style.cssText = "position: absolute; z-index:-1;" 
  
  this.initCanvas = function(){
  	// change dimensions to match
  	var style = window.getComputedStyle(imgLoader, null);
  	var h  = style.getPropertyValue("height");
  	var w  = style.getPropertyValue("width");
  	transpNode.height = canvas.height = parseInt(h.replace("px", ""));
  	transpNode.width = canvas.width = parseInt(w.replace("px", ""));
  		
  	this._drawTransparancy();	
  	this._drawImage();
  	callEvent("initialized");
  }
  
  this._drawTransparancy = function() {
  	// draws the transparancy background
  	var styles = ["#E0E0E0", "#F0F0F0"];
  	var ctx = transpNode.getContext("2d");
  	var toggler = false;
  	for (var row = 0; row < canvas.height; row += 10) {
  	  for (var col = 0; col < canvas.width; col += 10) {
  	  	ctx.fillStyle = styles[toggler ? 1 : 0];
  	    ctx.fillRect(col, row, 10, 10);
  	    toggler = !toggler;
  	  }
  	  toggler = !toggler;
  	}
  }
  
  this._drawImage = function() {
  	// paint image onto canvas
  	var ctx = canvas.getContext("2d");
  	ctx.drawImage(imgLoader, 0, 0);
  }
  
  this.startProcessOld = function() {
  	// reads the image from canvas
  	var ctx = canvas.getContext("2d");
  	var pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  	var endPoint = canvas.height * canvas.width * 4; // 4 = 4 color channels returned per pixel
  	this._isAlpha = false;
  	var colorFunc = this["_colorIdx_" + this._displayColorDepth ];
  	var colors = [], pixels = [], alphas =0;
  	colors.key_store = {}; //var pixelsStarts = [];
  	// loop through the pixels
  	for (var p = 0; p < endPoint; p += 4) {
  	  var red   = pixelData[p];
  	  var green = pixelData[p + 1];
  	  var blue  = pixelData[p + 2];
  	  var alpha = pixelData[p + 3];
  	  
  	  if (alpha < alphaThreshold) {
        ++alphas;
        pixels.push(0); // alpha channel just set bit to zero (no color)
        continue;
  	  } 
  	  
      var colorEntry = colorFunc(red, green, blue, colors);
  	  pixels.push(1); 
  	  for(var i = 0; i < _t._colorDepth; ++i){
   	    pixels.push((colorEntry & (1 << i)) >>> i); 
  	  }
  	 // pixelsStarts.push(p / 4); // debug
  	}
  	
  	// tell the world that we have an alpha channel picture
  	if (alphas > 0) {
  	  this._isAlpha = true;
  	  callEvent("hasAlpha");
  	} else {
  	  // no alpha delete the first bit of each color pixel
  	  for(var p = 0; p < pixels.length; ++p) {
  	    if (pixels[p] == 1) {
  	      pixels.splice(p, 1);
  	      --p; // decrement as we have removed this one
  	      p += this._colorDepth; // go to next pixel
  	    }
  	  }
  	}
  	
  	  	// make to bytes
  	var  byte = 0, bitPos = 0;
  	var end = pixels.length;
  	var buffSize = (end + (end % 8)) / 8
  	var byteChunks = new Uint8Array(buffSize)
  	var i = 0, ic = 0;
  	while(i < end) {
  		byte = byte | (pixels[i] << bitPos);
  		var b2 = pad(byte.toString(2), 8)
  		++bitPos;
  		if (bitPos == 8) {
  		  byteChunks[ic] = byte;
  		  ic++; bitPos = 0;
  		  byte = 0;
  		  var b1 = b2;
  		} 
  		i++;
  	}
  	// take care of possible trailing data in last byte
  	if (bitPos > 0) {
  		byteChunks[ic] = byte;
  	}
  	
  	this._dataBuffSize = buffSize;
  	this._pixelChunks = byteChunks;
  	this._colors = colors; 
  }
  
  
    
  // find and store each unique color in the color database
  //the 8 bites refers to target display color depth
  this._colorIdx_8 = function(red, green, blue, colors) {
  	// reduce color to 8bits
  	var r = Math.round(red * 7 / 255);  // leave 3 bits
  	var g = Math.round(green * 7 / 255);  // 3 bits
  	var b = Math.round(blue * 3 / 255); // 2 bit, blue is not that sensitive to human eye
  	var color = r;
  	color = color << 3;
  	color = color | g;
  	color = color << 2;
  	color = color | b;
  	var key = color.toString(2);
  	if (!(key in colors.key_store)) {
  	  colors.push(color)
  	  colors.key_store[key] = colors.length -1;
  	  return colors.length -1;
  	}
  	// color already stored in color database
  	return colors.key_store[key];
  }
  
    // find and store each unique color in the color database
  this._colorIdx_16 = function(red, green, blue, colors) {
  	// reduce color to 8bits
  	var r = parseInt((red * 31) / 0xFF);  // leave 5 bits
  	var g = parseInt((green * 63) / 0xFF);  // 6 bits, most sensitive to eye
  	var b = parseInt((blue * 31) / 0xFF); // 5 bits
  	var color = r;
  	color = color << 6; // make room for 6 bits green
  	color = color | g;
  	color = color << 5; // room for 5bits blue
  	color = color | b;
  	var key = color.toString(2);
  	if (!(key in colors.key_store)) {
  	  colors.push(color)
  	  colors.key_store[key] = colors.length -1;
  	  return colors.length -1;
  	}
  	return colors.key_store[key];
  }
  
  
  
  this.startProcess = function(){
    // initialize near color dbs
    var greenDb = [], redDb = [], blueDb = [];
    [greenDb, redDb, blueDb].forEach(function(db){
   	// add 51 arrays to each 255/5=51 so find nearest will
   	// find nearest color within 5 steps when color reducing
      for(var i = 0; i <= 51; ++i){
   	    db[i] = [];
      }
    });
  	  
  	// reload and read image from canvas
  	this._drawImage();
	var ctx = canvas.getContext("2d");
	var pixelData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
	var endPoint = canvas.height * canvas.width * 4; // 4 = 4 color channels returned per pixel
	this._isAlpha = false;
	var rgbFunc = this["_toRgb" + this._displayColorDepth ];
	var colorDb = {}, pixels = [], alphas = 0, colorCount = 0;
	 //var pixelsStarts = [];
	// loop through the pixels
	for (var p = 0; p < endPoint; p += 4) {
			  
      if (pixelData[p + 3] < alphaThreshold) {
        ++alphas;
        pixels.push('t'); // transparent pixel
        continue;
      } 
      
      var colorObj = {	
	    red:   pixelData[p],
	    green: pixelData[p + 1],
        blue:  pixelData[p + 2]
	  };
	  	  
      // pixelsStarts.push(p / 4); // debug
      
      var key = rgbFunc(colorObj);
      pixels.push(key);
      if (colorDb[key]) {
        ++colorDb[key].votes
        continue;
      }
      
      // add a new color to DB
      colorDb[key] = colorObj;
      colorObj.votes = 1;
      colorObj.dataPos = p;
      colorObj.key = key;
      ++colorCount;
      
      // add to nearest colorDb
      var redIdx = Math.round(pixelData[p] / 5);
      redDb[redIdx].push(colorObj);
      
      var greenIdx = Math.round(pixelData[p + 1] / 5);
      greenDb[greenIdx].push(colorObj);
      
      var blueIdx = Math.round(pixelData[p + 2] / 5);
      blueDb[blueIdx].push(colorObj);
    }
    
    if (alphas > 0) {
      this._isAlpha = true;
  	  callEvent("hasAlpha");
    }
    
    // reduce all colors to max this._colorDepth
    var colorDepth = this._colorDepth; // save some lookup cycles in each loop
    var colorDbSort = []; 
    for(var colorId in colorDb) {
      if (colorDb.hasOwnProperty(colorId)) {
      	colorDbSort.push(colorId);
      }
    }
    // sort descending based on votes
    colorDbSort.sort(function(a, b){return b.votes - a.votes});
    
    // redirect color to nearest color in color table
    var nearestSteps = 0, iterations = 0, redirectDb = {};
    var depthMax = Math.pow(2, this._colorDepth);
    while(colorDbSort.length > depthMax) {
      // main loop first test within 5 steps neibour
      var i = colorDbSort.length -1;
      while(i-- >= 0 && colorDbSort.length  > depthMax){
      	var sortItem = colorDbSort.splice(i,1)[0];
        var p = colorDb[ sortItem ].dataPos, key = colorDb[ sortItem ].key;
        var red   = pixelData[p];
        var green = pixelData[p + 1];
        var blue  = pixelData[p + 2];
        var redDbId   = Math.max(Math.min(Math.round(red / 5) + nearestSteps, 51), 0);
        var greenDbId = Math.max(Math.min(Math.round(green / 5) + nearestSteps, 51), 0);
        var blueDbId  = Math.max(Math.min(Math.round(blue / 5) + nearestSteps, 51), 0);
        
        // find in the near color databases
        if (greenDb[greenDbId].some(function(color){
            var p = color.dataPos;
            if (color.key != key && !(color.key in redirectDb) &&
                redDbId == Math.round(pixelData[p] / 5) &&
                blueDbId == Math.round(pixelData[p + 2] / 5))
             {
          	   return redirectDb[key] = color.key;
             }
          }))
          continue;
       
        if (redDb[redDbId].some(function(color){
          var p = color.dataPos;
          if (color.key != key && !(color.key in redirectDb) &&
              greenDbId == Math.round(pixelData[p + 1] / 5) &&
              blueDbId == Math.round(pixelData[p + 2] / 5))
            return redirectDb[key] = color.key;
          }))
          continue;
          
        if (blueDb[blueDbId].some(function(color){
          var p = color.dataPos;
          if (color.key != key && !(color.key in redirectDb) &&
              redDbId == Math.round(pixelData[p] / 5) &&
              greenDbId == Math.round(pixelData[p + 1] / 5))
            return redirectDb[key] = color.key;
          }))
          continue;
          
        // not found a match, put back elemnt and try next higher in list
        colorDbSort.splice(i, 0, sortItem);
      }
      
      // next main loop
      // how many steps from color we should search, first 5 color steps, then 10 then 15 etc
      if (nearestSteps == 0) {
        ++nearestSteps;
      } else if (nearestSteps < 0) {
        nearestSteps = (-nearestSteps) + 1;
      } else {
        nearestSteps = -nearestSteps;
      }
    
    }
    
    // create lookup hash tree colorIds
    colorDbSort.idKeys = {};
    for(var i = 0; i < colorDbSort.length; ++i){
      colorDbSort.idKeys[ colorDbSort[i] ] = i;
    }
    
     // done with colortable reduce
    
    // spit out pixels
   	var buf = 0, bitPos = 0, byte = 0, bit = 0;
  	var end = pixels.length;
  	var buffSize = ((end + (end % 8)) / 8) * this._colorDepth;
  	var byteChunks = new Uint8ClampedArray(buffSize)
  	var i = 0, ic = 0, colorId = 't', colorIdx = 0, color = 0;
  	var reduced = 0;
  	var p = 0; // debug
  	while(i < end) {
  		colorId = pixels[i++];
  		bit = colorId == 't' ? 0 : 1;
  		if (alphas > 0) {
  		  buf = ((buf << 1) | bit); // shift up 1 and store
  		  ++bitPos;
  		  p++; // debug
  		}
  		if (bit) {
          // store colorId
          while(redirectDb[colorId]) {
            colorId = redirectDb[colorId];
          }
          colorIdx = colorDbSort.idKeys[colorId];
  		  buf = ((buf << this._colorDepth) | colorIdx) ; // shift up and store colorId
  		  bitPos += this._colorDepth;
  		}
  		
  		while (bitPos > 8) {
  		  byte = buf & (0xFF << (bitPos -8));
  		  byteChunks[ic++] = byte >> (bitPos -8); // store this byte
  		  bitPos -= 8;
  		  // turn off these bits in buf as they have been stored
  		  var reduced = (0xFFFFFFFF >>> (32 - bitPos)); // max value int32 downshift to present pos
  		  buf = buf & reduced; // preserve reamining bits
  		} 
  	}
  	// take care of possible trailing data in last byte
  	if (bitPos > 0){
  	  while(bitPos > 0) {
  	    var tmp = buf & (1 << (bitPos -1));
  	    byte = byte | tmp;
  	    --bitPos;
  	    p++; // debug
  	  }	
  		
  	  byteChunks[ic] = byte;
  	}
  	
  	
  	console.log("pixels", p)
  	console.log("rows", (p) / canvas.width);
  	
  	this._dataBuffSize = ic;//buffSize;
  	this._pixelChunks = byteChunks;
  	this._colors = colorDbSort; 
  }
  
  	  
  //the 8 bits refers to target display color depth
  this._toRgb8 = function(obj) {
  	// reduce color to 8bits
  	obj.red   = Math.round(obj.red * 7 / 255);  // leave 3 bits
  	obj.green = Math.round(obj.green * 7 / 255);  // 3 bits
  	obj.blue  = Math.round(obj.blue * 3 / 255); // 2 bit, blue is not that sensitive to human eye
  	var color = obj.red;
  	color = color << 3;
  	color = color | obj.green;
  	color = color << 2;
  	color = color | obj.blue;
  	return color.toString(16);
  }
  
  this._toRgb16 = function(obj) {
    obj.red   = Math.round((obj.red * 31) / 0xFF);  // leave 5 bits
  	obj.green = Math.round((obj.green * 63) / 0xFF);  // 6 bits, most sensitive to eye
  	obj.blue  = Math.round((obj.blue * 31) / 0xFF); // 5 bits
  	var color = obj.red;
  	color = color << 6; // make room for 6 bits green
  	color = color | obj.green;
  	color = color << 5; // room for 5bits blue
  	color = color | obj.blue;
  	return color.toString(16);
  }
  
   this._toRgb24 = function(obj) {
    obj.red   = obj.red;  
  	obj.green = obj.green
  	obj.blue  = obj.blue ;
  	var color = obj.red;
  	color = color << 8; // make room for 6 bits green
  	color = color | obj.green;
  	color = color << 8; // room for 5bits blue
  	color = color | obj.blue;
  	return color.toString(16);
  }
  

  
  
  this.setDisplayColorDepth = function(depth){
  	_t._displayColorDepth = parseInt(depth);
  }
  
  this.setColorDepth = function(depth) {
  	_t._colorDepth = parseInt(depth);
  }
  
  this.generateCSourceText = function(imageName) {
  	// helper function to generate array values in c source
  	function toHex(arr, maxlen){
  	  var srcText = "", cols = 0;
  	  for(var i = 0; i < maxlen; ++i){
        srcText += "0x" + arr[i].toString(16);
        if (i < maxlen -1 ){
          srcText += ",";
          cols++;
          if (cols > 20 && i < maxlen-1) {
            srcText += "\n    ";
            cols = 0;
          }
        }
      }
      return srcText;
  	}
  	
  	var romSize = this.romSize(); 
  	var romSizeKb = (romSize / 1024).toFixed(2);
  	
  	// Returns C source for this image
    return "#import <limits.h> \n" +
           "/* auto generated file to embed img in uC program memory \n" +
           "   Size in FLASH of this image:" + romSize + "bytes (" + romSizeKb + "kb) */ \n" +
           "static const struct { \n" +
           "  uint16_t width; \n" +
           "  uint16_t height; \n" +
           "  uint16_t colorMap[" + this._colors.length + "]; \n" +
           "  uint8_t data[" + this._dataBuffSize +  "] \n" +
           "} " + imageName + " { \n" +
           canvas.width + ", " + canvas.height + ", \n" +
           "  {" + toHex(this._colors, this._colors.length) + "}, \n" +
           "  {" + toHex(this._pixelChunks, this._dataBuffSize) + "}";  
  }
  
  this.romSize = function(){
  	return this._dataBuffSize + this._colors.length + 2 + 2;
  }
  
  this.isAlpha = function(){
  	return _t._isAlpha;
  }
  
 
  
  this._drawBitDepthAlpha = function(ctx, colorizer) {
  	// draws the image onto the canvas to show how it performs
  	
  	var imgData = ctx.createImageData(canvas.width, canvas.height);
  	var pixelData = imgData.data;
  	
  	var end = this._dataBuffSize;
  	var buf = this._pixelChunks;
  	var p = 0, bitPos = -1, colorId = 0;
  	var lsbPos = -1, msbPos = -1;
  	var msbPosDec = this._isAlpha ? 1 : 0;
  	var lsbPosDec = this._colorDepth -1;
  	for(var i = 0; i < end; ++i){
  	  var byte = buf[i];
  	  //var byte1Str = pad(buf[i].toString(2), 8);
  	  //var byte2Str = pad(buf[i+1].toString(2), 8);
  	  /*if (lsbPos > -1) {
  	    // a colored pixel, colorIdx continues on this byte
  	    colorId = colorId << (lsbPos < 7 ? 7 - lsbPos : 0); // migth continue on onto next byte
  	    var shiftMe = (lsbPos > 0 ? lsbPos : 0);
  	    colorId = colorId | ((byte & (0xFF << shiftMe)) >>> shiftMe);
  	    lsbPos -= shiftMe +1;
  	      
  	    // render pixel
  	    if (lsbPos == -1) {
  	      pixelData = colorizer.call(this, pixelData, p, colorId);
  	  	  p += 4;
  	  	  colorId = 0;
  	    }
  	  } else */
  	  /*if (byte > 0) {
  	    // start a new pixel, find bit pos of starting bit
  	    do {
  	      var flag = 1 << 8;
  	      for(var j = 7; j >= 0; --j){
  	      	flag = flag >> 1;
  	        if (flag & byte){
  	          msbPos = (7 - j) + msbPosDec; 
  	          lsbPos = msbPos + lsbPosDec; // pos relative to msbPos
  	          break;
  	        }
  	      }
  	    
  	      if (msbPos > 7){
  	      	if (i >= end) break;
  	      	// starts in next byte
  	      	byte = buf[++i]; // load next byte
  	      	msbPos -= 8;
  	      	lsbPos -= 8;
  	      }
  	      // start colorIdx storage
  	      var hiFlag = (0xFF >>> msbPos);
  	      var moveTo = 0, nextPos = 1, shiftIn = 0;
  	      while(lsbPos > -1){
  	        if (lsbPos < 8){ // remaning bits ends in this byte
  	          shiftIn = (7 - lsbPos);
  	        }
  	        flag = hiFlag & (0xFF << shiftIn);
  	       
  	        colorId = colorId << moveTo;
  	        
  	        colorId = colorId | ((byte & flag) >> shiftIn) ;
  	        nextPos = lsbPos +1;
  	        lsbPos -=  ((lsbPos > 8) ? 8 : lsbPos + 1);
  	        if (lsbPos < 0 || i >= end) break;
  	        hiFlag = 0xFF;
  	        msbPos = 0;
  	        moveTo = lsbPos +1;
  	        byte = buf[++i];
  	      }
  	      // render pixel
  	      pixelData = colorizer.call(this, pixelData, p, colorId);
  	  	  p += 4; colorId = 0;
  	      // find more pixels in this byte (when colorDepth < 8)
  	      byte = byte & (0xFF >>> nextPos);
  	    } while (i < end && byte > 0);
  	    if (nextPos > 7) continue;
  	  } 
  	  
  	  if (byte == 0) {
  	    // add 8 transparent pixels
  	    for(var j = 0; j < 8; ++j){
  	      pixelData[p] = 0;
  	      pixelData[p +1] = 0;
  	      pixelData[p +2] = 0;
  	      pixelData[p +3] = 0;
  	      p += 4;
  	    }
  	  }
  	  */
  	  var mask = 0x100;
  	  for(var j = 7; j >= 0; --j){
  	  	mask = mask >>> 1;
  	  	// byte loop
  	  	var pixel = p / 4;
  	  	if (bitPos >= 0) {
  	  	  var tmp = byte & mask;
  	  	  colorId = colorId | tmp >>> j;
  	  	  bitPos++;
  	  	  if (bitPos == this._colorDepth) {
  	  	  	// draw pixel
  	  	  	pixelData = colorizer.call(this, pixelData, p, colorId);
  	  	  	p += 4;
  	  	  	bitPos = -1; colorId = 0;
  	  	  	continue;
  	  	  }
  	  	  colorId = colorId << 1;
  	  	} else if(byte & mask){
  	  	  // start a pixel
  	  	  ++bitPos;
  	  	} else {
  	  	  // alpha channel pixel
  	  	  pixelData[p] = 0;
  	  	  pixelData[p +1] = 0;
  	  	  pixelData[p +2] = 0;
  	  	  pixelData[p +3] = 0;
  	  	  p += 4;
  	  	}
  	  }
  	  
  	  /*for(var j = 7; j >= 0; --j){
  	  	// byte loop
  	  	var pixel = p / 4;
  	  	if (bitPos >= 0) {
  	  	  var tmp = byte & (1 << j);
  	  	  tmp = tmp >>> j;
  	  	  colorId = colorId | (tmp << bitPos);
  	  	  bitPos++;
  	  	  if (bitPos == this._colorDepth) {
  	  	  	// draw pixel
  	  	  	pixelData = colorizer.call(this, pixelData, p, colorId);
  	  	  	p += 4;
  	  	  	bitPos = -1; color = 0;
  	  	  }
  	  	} else if((byte & (1 << j))){
  	  	  // start a pixel
  	  	  ++bitPos;
  	  	} else {
  	  	  // alpha channel pixel
  	  	  pixelData[p] = 0;
  	  	  pixelData[p +1] = 0;
  	  	  pixelData[p +2] = 0;
  	  	  pixelData[p +3] = 0;
  	  	  p += 4;
  	  	}
  	  }*/
  	}
  	console.log("pixels", p / 4)
  	console.log("rows", (p / 4) / canvas.width)
  	
  	ctx.putImageData(imgData, 0, 0, 0, 0, canvas.width, canvas.height);
  }
  
  // the 8 bits refers to what the target display can handle
  this._colorize8Bit = function(pixelData, pos, colorIdx) {
  	var color = parseInt(this._colors[colorIdx], 16);
  	var r = Math.round((color & 0xE0) >>> 5); // bits 7-5
  	var g = Math.round((color & 0x1C) >>> 2); // bits 4-1
  	var b = Math.round(color & 0x03); // bits 1-0
    pixelData[pos] = (r * 255) / 7;
    pixelData[pos +1] = (g * 255) / 7;
    pixelData[pos +2] = (b * 255) / 3;
    pixelData[pos +3] = 0xFF;
    return pixelData;
  }
  
    // the 16 bits refers to what the target display can handle
  this._colorize16Bit = function(pixelData, pos, colorIdx) {
  	var color = this._colors[colorIdx];
  	var r = (color & 0xF800) >>> 11; // bits 15-11
  	var g = (color & 0x07E0) >>> 5; // bits 10-5
  	var b = color & 0x001F; // bits 4-0
  	var red = parseInt((r * 0xFF) / 31);
  	var green = parseInt((g * 0xFF) / 63);
  	var blue = parseInt((b * 0xFF) / 31);
    pixelData[pos] = red;
    pixelData[pos +1] = green;
    pixelData[pos +2] = blue;
    pixelData[pos +3] = 0xFF;
    return pixelData;
  }
  
  this._colorize24Bit = function(pixelData, pos, colorIdx) {
  	var color = this._colors[colorIdx];
  	var r = (color & 0xFF0000) >>> 16; // bits 15-11
  	var g = (color & 0x00FF00) >>> 8; // bits 10-5
  	var b = color & 0x0000FF; // bits 4-0
  	var red = parseInt((r * 0xFF) );
  	var green = parseInt((g * 0xFF));
  	var blue = parseInt((b * 0xFF));
    pixelData[pos] = red;
    pixelData[pos +1] = green;
    pixelData[pos +2] = blue;
    pixelData[pos +3] = 0xFF;
    return pixelData;
  }
  
  this.drawCompressedImage = function(){
  	var ctx = canvas.getContext("2d");
  	ctx.clearRect(0, 0, canvas.width, canvas.height);
  	
  	var drawFunc = '_draw'// + this._colorDepth ;
  	if (this._isAlpha) {
  		drawFunc +=  'BitDepthAlpha';
  	} else {
  		drawFunc += 'BitDepth';
  	}
  	var colorizerFunc = '_colorize' + this._displayColorDepth + 'Bit';
  	
  	this[drawFunc](ctx, this[colorizerFunc]);
  }
  
  // event types for this class
  this._events = {
  	initialized: [],
  	hasAlpha: [],
  	startProcess:[],
  	finishedProcess:[]
  }
  
  // event callbacks
  this.addEventListener = function(evt, callback){
  	if (evt in this._events) {
  	  this._events[evt].push(callback);
    }
  }
  
  // internal to this class manages the calls to each registered event callback
  function callEvent(evt){
  	for(var i = 0; i <  _t._events[evt].length; ++i){
  	  _t._events[evt][i]();
  	}
  }
  
  
  // initialize events and such on constructor time
    // allow image to load first
  //imgLoader.addEventListener("load", function(){this.initCanvas; }, false);
  imgLoader.onload = function(){ _t.initCanvas.call(_t); };
}

Number.prototype.map = function ( in_min , in_max , out_min , out_max ) {
  return ( this - in_min ) * ( out_max - out_min ) / ( in_max - in_min ) + out_min;
}

function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

