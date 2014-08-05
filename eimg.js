(function(){
	function bitsInValue(value){
		var cnt =0;
		while(value > 0){
			value >>= 1;
			++cnt;
		}
		return cnt;
	}
	
	
	/*
		EImage compresses (streamifies) a image to embedded format
		suitable for embedding in a uC tiny flash memory
	*/
	
	var DRAW_PIXEL_FUNC = function(/*int16_t*/x, /*int16_t*/ y, /*uint16_t*/color){ /*definition stub, Macro should be set be dev in header file*/ }
	function EImg(config){
		
		this._displayColorDepth = parseInt(config.displayColorDepth) || 8;
		this._canvasNode = config.canvasNode || 0;
		
		DRAW_PIXEL_FUNC = this._getDrawPixelFunc();
		
	}
	
	/**
	* @brief creates stream of bytes from a pixture array (as the one from canvas context imgData.data)
	* @param imgArr Uint8Array a imgData.data array to be compressed
	* @param width of image
	* @param transparencythreshold = 128 (optional), determines how low alpa channel can get before its transparent
	* @return a Uint8Array with the shrinked image as a ordered stream of bits 
	*/ 
	EImg.prototype.compress = function(imgArr, width, transparencyTreshold){
		this._width = width;
		this._height = (imgArr.length / 4) / width;
		this._transparencyThreshold = typeof transparencyTreshold != 'undefined' ? transparencyTreshold : 128;
		
		var imgData = this._readImg(imgArr);
		
		var colorCnt = imgData.colorMap.length -1;
		var shortMeta = this._width <= 32 && this._height <= 32 && colorCnt <= 128;
		var meta = shortMeta ? 0 : 1;
		meta = (meta << 1) | (this._transparency ? 1 : 0);
		
		this._colorDepth = 1;
		var colorBits = 0;
		var mask = 1;
		if (colorCnt > 1){
			colorBits = 1;
			do{
				colorCnt = colorCnt >> 1;
				colorBits += 1;
				mask = (mask << 1) | 1;
				++this._colorDepth;
			}while(colorCnt -1);
		} else {
			mask = 1;
		}
		
		if (!imgData.visiblePixels && Message){
			new Message("No visible pixels, adjust transparency threshold?", 'warn');
			return [];
		}
		var visiblePixels = imgData.visiblePixels || 1;
		
		var totalBytes = shortMeta ? 2 : 4; // meta headerbytes
		totalBytes += Math.ceil((imgData.colorMap.length * this._displayColorDepth) / 8) + 
						Math.ceil(Math.ceil((Math.log(imgData.colorMap.length) / Math.LN2) + 1) / 7); // colorTable size bytes (should be just a few bytes)
		if (this._transparency) {
			totalBytes += Math.ceil(((this._width * this._height) / 8) + 
							((visiblePixels * this._colorDepth) / 8));
		} else {
			totalBytes += Math.ceil((this._width * this._height * this._colorDepth) / 8);
		}
		var bytes = new Uint8ClampedArray(totalBytes + 0);
		bytesPos = 0;
		if (shortMeta) {
			meta = (meta << 3) | (colorBits & 0x07);        // colors 0b0000 0111
			meta = (meta << 3) | ((this._width -1) & 0x18) >> 3; // width  0b0001 1000 + 1 reserved
			meta = (meta << 3) | ((this._width -1) & 0x07); 		// width  0b0000 0111
			meta = (meta << 5) | ((this._height -1) & 0x1F); 	// height 0b0001 1111  5 bits 
			bytes[bytesPos++] = (meta & 0xFF00) >> 8;
			bytes[bytesPos++] = meta & 0x00FF;
		} else {
			// extended meta more colors and bigger image, byte 2bytes bigger metaheader
			meta = (meta << 4) | (colorBits & 0x0F);		// colors 0b0000 1111
			meta = (meta << 14)| ((this._width) & 0x0FFF);    // width  0b0000 1111 1111 1111 + 2 reserved bits
			meta = (meta << 12)| ((this._height) & 0x0FFF); 	// height 0b0000 1111 1111 1111
			bytes[bytesPos++] = (meta & 0xFF000000) >>> 24;
			bytes[bytesPos++] = (meta & 0x00FF0000) >>> 16;
			bytes[bytesPos++] = (meta & 0x0000FF00) >>> 8;
			bytes[bytesPos++] = meta & 0x000000FF;
		}
		
		function store(bitPos, byte){
			bytes[bytesPos++] = (byte >>> Math.max(0, bitPos - 8));
		}
		function trailing(bitPos, byte){
			if (bitPos) {
				byte = byte << (8 - bitPos);
				store(byte, 0);
			}
			return 0;
		}
		
		// store number of color table entrie (may be less than what is configed, messes up render algorithm)
		// we begin from behind storing this variable so we granate that bits start from bit 1 on the last byte
		var byte = 0, value = (imgData.colorMap.length * (this._displayColorDepth / 8));
		var cTableBitsCnt = bitsInValue(value);//Math.floor((Math.log(value) / Math.LN2) + 1);
		var pos = bytesPos + Math.ceil(bitsInValue(value) / 7);// Math.ceil(Math.ceil((Math.log(value) / Math.LN2) + 1) / 7);
		if (this._displayColorDepth == 1){ // monochrome fix
			cTableBitsCnt = 7;
			pos = bytesPos +1;
			value = 1;
		}
		var endPos = pos;
		var mask = 0x7F, lastbit = 1, shift = 0, u8 = 0;
		for(var i = 0; i < cTableBitsCnt; i += 7){
			u8 = ((value & mask) >> shift) << 1;
			mask <<= 7;
			lastbit = (pos < endPos) ? 1 : 0
			u8 |= lastbit;
			shift += 7;
			bytes[--pos] = u8;
		}
		bytesPos = endPos;
		
		
		// spit out colortable
		var byte = 0, bitPos = 0;
		bitPos = 23, short = 0; this.debugIn = [];
		for(var c = 0, end = imgData.colorMap.length; c < end; /*in code below*/){
			while(bitPos > 15){
				var color = imgData.colorMap[c];
				bitPos -= this._displayColorDepth;
				short |= color << (bitPos + 1);
				++c;
			}
			while(15 >= bitPos || ((p == end) && bitPos < 23)){
				var byte = (short & 0xFF0000) >>> 16;
				store(0, byte);
				short &= 0x00FFFF;
				short <<= 8;
				bitPos += 8;
			}
		}

		/*
		for(var i = 0, end = imgData.colorMap.length; i < end; ++i){
			byte = (byte << this._displayColorDepth) | imgData.colorMap[i];
			bitPos += this._displayColorDepth;
			while(bitPos > 7) {
				 store(bitPos, byte);
				 bitPos = Math.max(0, bitPos - 8);
				 byte = byte & (0xFFFFFF >>> (24 - bitPos));
			}
		}
		bitPos = byte = trailing(bitPos, byte);
		*/
		
		// spit out pixelsinfo
		bitPos = 23, short = 0; 
		for(var p = 0, end = this._width * this._height; p < end; /*in code below*/){
			while(bitPos > 15){
				var colorIdx = imgData.pixelColorMapIdx[p];
				var hasColor = colorIdx != -1;
				if(this._transparency){
					short |= (hasColor ? 1 : 0) << bitPos--;
				}
				if (hasColor){
					bitPos -= this._colorDepth;
					short |= colorIdx << (bitPos + 1) ;
				}
				++p;
			}
			while(15 >= bitPos || ((p == end) && bitPos < 23)){
				var byte = (short & 0xFF0000) >>> 16;
				store(0, byte);
				short &= 0x00FFFF;
				short <<= 8;
				bitPos += 8;
			}
		}
		
		return bytes;
	}
	
	/**
	* @breif: parses a stream of bytes into a Uint8Array 
	* @param byteStream Uint8array of compressed bits
	* @return Uint8Array 
	*  @see setImageData 
	*/
	EImg.prototype.decompress = function(byteStream){
		
		var IS_EXTENDED_META       = 0x80; // 0b1000 0000
		var IS_TRANSPARENT         = 0x40; // 0b0100 0000
		var EXTENDED_COLOR_DEPTH   = 0x3C; // 0b0011 1100
		var SHORT_COLOR_DEPTH      = 0x38; // 0b0011 1000
		
		var bytesPos = 0;
		var meta_b1 = byteStream[bytesPos++];
		var width = 1;
		var height = 1;
		var colorDepth = 1;
	
		
		if (meta_b1 & IS_EXTENDED_META){
			colorDepth = (meta_b1 & EXTENDED_COLOR_DEPTH) >> 2; // 2 reserved bits
			width = (byteStream[bytesPos++] << 4) | (byteStream[bytesPos] & 0xF0) >> 4;// b2->0b1111 1111 + b3->0b1111 0000
			height = ((byteStream[bytesPos++] & 0x0F) << 8) | byteStream[bytesPos++];  // b3->0b0000 1111 + b4->0b1111 1111
		} else {
			colorDepth = (meta_b1 & SHORT_COLOR_DEPTH) >> 3; // 3 bits shifted 
			width = ((meta_b1 & 0x03) << 3) | ((byteStream[bytesPos] & 0xE0) >> 5); // b1->0b0000 0011 + b2->0b1110 0000
			height = byteStream[bytesPos++] & 0x1F; 						 // b2->0b0001 1111
			width += 1; // 0 = 1 pixel saves some space assuming nobody has a picture of 0 pixels :)
			height += 1;
		}
		// done with meta header
		
		// js specific, dont copy to C...
		this._colorDepth = colorDepth;
		this._width = width;
		this._height = height;
		this._transparency = (meta_b1 & IS_TRANSPARENT) > 0;
		
		// ------------ start read color table size ------------
		// start reading in number of entries in the colorTable (might be less than what is set as max in meta)
		var byte, colorTableSize = 0;
		
		// read the stream length, it should be here just before the colors
		// first find the stop byte for this segment (bit[0] = 0)
		var pos = bytesPos;
		var nextPos;
		do {
			byte = byteStream[pos++];
		}while(byte & 1);
		nextPos = pos;
		
		// read it into variable, little end last
		var bitPos = 0;
		do { // continue as long as last bit is 1, size ends with 0 on last byte
			// NOTE in C we might use union here with uint32 and uchar[4] to speed up?
			byte = byteStream[--pos];
			colorTableSize |= ((byte & 0xFE) >> 1) << bitPos;
			bitPos += 7;
		} while(pos > bytesPos);
		
		bytesPos = nextPos;
		// ------------ end color table size --------------
		
			
		// ---------- color table start and finish -----------
		var colorMapStart = bytesPos;
		var pixelStart = bytesPos + colorTableSize;
		
		
		// ---------- start render pixels ----------------
		bytesPos = pixelStart;
		var getColor = this._getColorLookupFunc();
		
		if (!colorDepth) colorDepth = 1; // monocrome?
		
		// find out haw many bit there is in colorDepth
		var test = Math.pow(2, colorDepth) -1;
		var colorMask = 0;
		while(test > 0){
			colorMask = (colorMask << 1) | 1;
			test >>= 1;
		}
		colorMask <<= 23 - colorDepth;
		
		var colorMax = Math.pow(2, colorDepth);
		
		
		// render pixels
		var bitPos = -1, colorIdx = 0, colorIdx = 0;
		if (meta_b1 & IS_TRANSPARENT){
			if (!colorDepth) colorDepth = 1; // monocrome?
			//var colorMask = (Math.pow(2, colorDepth) -1) << (23 - colorDepth); 
			var pixelMask = 1 << 23;
			var short = 0, pMask = pixelMask >> 8, bitPos = 15, cMask; //= colorMask << (15 - colorDepth);
			for(var p = 0, x, y, end = width * height -2; p < end; /*change in code*/){
				short = (byteStream[bytesPos] << 16);
				short |= (byteStream[bytesPos +1] << 8);
				short |= byteStream[bytesPos +2]; // we load one byte at a time swaping low for higher byte
				++bytesPos;
				pMask <<= 8;
				bitPos += 8;
				cMask <<= 8;
				while(bitPos > 15 && p < end){
					if(pMask & short){
						// a visible pixel lookup color
						cMask = colorMask >> (23 - bitPos);
						bitPos -= colorDepth;
						colorIdx = (short & cMask) >> bitPos;
						pMask >>= colorDepth;
						//cMask >>= colorDepth;
						
						if (colorIdx > colorMax)
							throw "Error in parser colorIdx to high, its a bug";
						
						// render it
						y = parseInt(p / width);
						x = p - (y * width);
						DRAW_PIXEL_FUNC(x, y,  getColor(byteStream, colorMapStart, colorIdx));
					}
					pMask >>= 1;
					//cMask >>= 1;
					--bitPos;
					++p; // increment pixels
				}
			}
	
		} else {			
		
			
			var short = 0, bitPos = 15, cMask;// = (colorMask <<  (16 - colorDepth));
			for(var p = 0, pix = 0, x, y, end = width * height; p < end; /*in code*/){
				short  = byteStream[bytesPos] << 16;
				short |= byteStream[bytesPos +1] << 8;
				short |= byteStream[bytesPos +2];
				++bytesPos;
				bitPos += 8;
				cMask <<= 8;
				while(bitPos > 15 && p < end){
					cMask = colorMask >> (23 - bitPos);
					bitPos -= colorDepth;
					colorIdx = (short & cMask) >> (bitPos +1);
					//cMask >>= colorDepth;
					
					if (colorIdx > Math.pow(2, colorDepth))
						throw "Error in parser colorIdx to high, its a bug";
					
					// render it
					y = parseInt(p / width);
					x = p - (y * width);
					DRAW_PIXEL_FUNC(x, y,  getColor(byteStream, colorMapStart, colorIdx));
					++p;
				}
			}
		}
		
		if (this._canvasNode){
			this.renderOnCanvas(this._canvasNode);
		}
		
		return this._renderDataObj;
	}
	
	/**
	* @brief convinience function, renders a EImg on canvas
	* @note EImg must have decompressed a image before calling this function
	* @param the canvas node to render on
	* @return the new imgDataObj (set )
	*/
	EImg.prototype.renderOnCanvas = function(canvas){
		if (!this._renderDataObj) throw "Called setImageData before you decompressed";
		
		canvas.width = this._width;
		canvas.height = this._height;
		var ctx = canvas.getContext("2d");
		var imageData = ctx.createImageData(this._width, this._height);
		for (var p = 0; p < imageData.data.length; ++p){
			imageData.data[p] = this._renderDataObj[p];
		}
		ctx.putImageData(imageData, 0, 0, 0, 0, canvas.width, canvas.height);
	}
	
	// do this in as separete function as it makes it easier to port to C code
	// intended to be inline function
	/*inline unsigned int*/
	//EImg.prototype._lookupColor = function(/*const unsigned char[] */byteStream,
	//									   /*const unsigned int*/ colorMapStarts,
	//									   /*const unsigned int*/ colorMapIdx,
	//									   /*const unsigned int*/ colorDepth){
	//	// TODO: should probably use bitfields and union here in C to speed up code (less bitshifts)
	//	var color = 0;
	//	var move = colorMapIdx * colorDepth;							   	
	//	var forward = parseInt(move / 8);
	//	var word = (byteStream[colorMapStarts + forward]) << 8 | byteStream[colorMapStarts + forward + 1];
	//	var mask = 0xFFFF >> 16 - colorDepth; 
	//	mask = mask << (16 - (move % 8));
	//	
	//	return (word & mask) >> 16 - (move % 8) - colorDepth;
	//}
	
	EImg.prototype._getColorLookupFunc = function(){
		var DISPLAY_DEPTH = this._displayColorDepth; // should be macro in C code, dev sets in header file
		switch(DISPLAY_DEPTH){
		case 1: return function(byteStream, colorMapStarts, colorMapIdx){
			if (byteStream[colorMapStarts] & (1 << (7 - colorMapIdx)))
				return 0; // pixel on = black color
			return 1; // white color
		}
		case 8: return function(byteStream, colorMapStarts, colorMapIdx){
			return byteStream[colorMapStarts + colorMapIdx];
		}
		case 16: return function(byteStream, colorMapStarts, colorMapIdx){
			var pos = colorMapStarts + (colorMapIdx * 2);
			return (byteStream[pos] << 8) | byteStream[pos + 1];
		}
		case 24: return function(byteStream, colorMapStarts, colorMapIdx){
			var pos = colorMapStarts + (colorMapIdx * 3);
			return (byteStream[pos] << 16) | (byteStream[pos+1] << 8) | byteStream[pos+2];
		}
		}
	}
	

	
	EImg.prototype.width = function(){
		return this._width;
	}
	EImg.prototype.height = function(){
		return this._height;
	}
	EImg.prototype.hasTransparency = function(){
		return this._transparency;
	}
	EImg.prototype.colorDepth = function(){ 
		return this._colorDepth; 
	}
	EImg.prototype.displayColorDepth = function(){
		return this._displayColorDepth;
	}
	
	
	
	EImg.prototype._readImg = function(imgArr){
		var shrinker = this._getDisplayDepthShrinker();
		var colorMap = []; colorMap.keys = {};
		var pixelColorMapIdx = new Int16Array(imgArr.length);
		var treshold = this._transparencyThreshold;
		var visiblePixels = 0;
		for(var color, r, g, b, i= 0, p = 0, end = imgArr.length; p < end; ++i, p += 4){
			if (imgArr[p + 3] < treshold){
				pixelColorMapIdx[i] = -1; // transparent pixel
				this._transparency = true;
				continue;
			}
			r = imgArr[p];
			g = imgArr[p + 1];
			b = imgArr[p + 2];
			color = r << 16;
			color = color | (g << 8);
			color = color | b;
			var colorStr = color.toString(16)
			if (typeof colorMap.keys[colorStr] == 'undefined'){
				// new color
				colorMap.keys[colorStr] = colorMap.length;
				colorMap.push(shrinker(r,g,b));
			}
			
			++visiblePixels;
			pixelColorMapIdx[i] = colorMap.keys[colorStr];
		}
		
		// if image has more color than the display can take
		if (colorMap.length > Math.pow(2, this._displayColorDepth))
			throw "Colors exceds what choosen display can handle, reduce the colors to " + 
			      this._displayColorDepth + "bits (" + Math.pow(2, this._displayColorDepth) + " colors)";
		
		/* // sort the colorMap so we can look it up in the uC without storing color table in ram
		colorMap.sort(function(a, b){ return a >b && b});
		// move the hash keys
		for(var i = 0; i < colorMap.length; ++i){
			colorMap.keys[ colorMap[i].toString(16) ] = i;
		} brainfart? */
		
		return {colorMap: colorMap, pixelColorMapIdx: pixelColorMapIdx,
		         visiblePixels: visiblePixels};
	}
	
	
	EImg.prototype._getDisplayDepthShrinker = function(){
		// shrink the color values from uint24 -> this._colorDepth;
		// we cant do it before because we dont know haw many colors there is before we have read the entire image
		var _t = this;
		switch(this._displayColorDepth){
		case 1: return function(r,g,b){
					// 2 possible colors, lit or not lit we reuse the threshold for 
					// alpha to determine color as black or not
					var off = _t._transparencyThreshold;
					if(r > off || g > off || b > off)
						return 1; // indicate as white (much whitness in sensed color)
					return 0; // black 
				};
		case 8: return function(r,g,b){
					// 256 possible colors
					var color = Math.round(r * 7 / 255);  // leave 3 bits
			  		color = (color << 3) | Math.round(g * 7 / 255);  // 3 bits
  					return  (color << 2) | Math.round(b * 3 / 255); // 2 bit, blue is not that sensitive to human eye
			    };
		case 16: return function(r,g,b) {
					// 65535 possible colors
					var color = Math.round(r * 31 / 255); //leave 5 bits
					color = (color << 6) | Math.round(g * 63 / 255); // leave 6 bits
					return  (color << 5) | Math.round(b * 31 / 255); // leave 5 bits
				};
		case 24: return function(r,g,b){
					// as a normal computer screen
					return (r << 16) | (g << 8) | b;
				};
		default:
			throw "Display depth not supported, got:" + this._displayColorDepth + ", must be either 1, 8, 16 or 24"
		}
	}
	
	
	// these tries to render the colors as they would apear on an embedded display (low on colors)
	EImg.prototype._getDrawPixelFunc = function(){
		function render(x, y, r, g, b, a){
			if (!this._renderDataObj) {
				this._renderDataObj = new Uint8Array(this._width * this._height * 4);
			}
			var idx = (x + (y * this._width)) * 4;
			this._renderDataObj[idx++] = r;
			this._renderDataObj[idx++] = g;
			this._renderDataObj[idx++] = b;
			this._renderDataObj[idx] = a;	
		}
		var _t = this;
		
		switch(this._displayColorDepth){
		case 1: return function(x, y, color){
			var r,g,b;
			// this is a special case as white color should be rendered transparent
			r = g = b = 0; // all black color  
			render.call(_t, x, y, r, g, b, (color ? 0xFF : 0));
		}
		case 8: return function(x, y, color){
			var r, g, b;
			r = (color & 0xE0) >> 5;
			g = (color & 0x1C) >> 2;
			b = color & 0x03;
			r = parseInt(r * 255 / 7);
			g = parseInt(g * 255 / 7);
			b = parseInt(b * 255 / 3);
			render.call(_t, x, y, r, g, b, 0xFF);
		}
		case 16: return function(x, y, color){
			var r, g, b;
			r = (color & 0xF800) >> 11;
			g = (color & 0x07E0) >> 5;
			b = (color & 0x001F);
			r = parseInt(r * 255 / 31);
			g = parseInt(g * 255 / 63);
			b = parseInt(b * 255 / 31);
			render.call(_t, x, y, r, g, b, 0xFF);
		}
		case 24: return function(x, y, color) {
			var r, g, b;
			r = (color & 0xFF0000) >> 16;
			g = (color & 0x00FF00) >> 8;
			b = color & 0x0000FF;
			render.call(_t, x, y, r, g, b, 0xFF);
		}
		
		default:
			throw  "Display depth not supported, got:" + this._displayColorDepth + ", must be either 1, 8, 16 or 24"
		}
	}
	
	this.EImg = EImg;
	
	  
  function pad(n, width, z) {
    z = z || '0';
    n = n + '', st = '';
    var s = new Array(width - n.length + 1).join(z).split('').concat(n.split(''));
    //console.log(n.split(''),new Array(width - n.length + 1).join(z).split(''), s);
    for(var i = 0; i < s.length; ++i){
    	st += s[i];
    	if (i && ((i + 1) % 4) == 0 && i < s.length -1) st += ' ';
    }
    return st;// n.length >= width ? n : st;
  }
  this.pad = pad;
}).call(this);