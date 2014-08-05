/**
* This file handles the gui related stuff of the html app
*/

(function(){
	
	// add a node in top of page that shows messages
	var messageContainer = document.createElement("div");
	messageContainer.className = 'messageContainer';
	document.addEventListener("DOMContentLoaded", function(){
		document.body.appendChild(messageContainer);
	});
	
	/**
	* shows a new message on the top screen
	*/
	function Message(message, type, keepOpen){
		if (!type in this.types)
			throw "Message type not known, its a bug in the application";
		this.typeName = type ? type  : 'info';
		this.type = this.types[this.typeName];
		this.message = message;
		
		this.div = document.createElement("div");
		this.div.className = "base " + this.typeName;
		var closeSpan = document.createElement("span");
		closeSpan.className = "closer";
		var txt = document.createTextNode(message);
		this.div.appendChild(txt);
		this.div.appendChild(closeSpan);
		
		var _t = this;
		closeSpan.addEventListener('click', function(){ _t.close.call(_t); });
		
		messageContainer.appendChild(this.div);
		
		if(this.type > 0){
			this._timeout = setTimeout(function(){ _t.close.call(_t);}, this.type);
		}
	}
	Message.prototype.types = {'info':1000, 'warn':5000, 'error':0};
	
	Message.prototype.close = function(){
		if (this._timeout)
			clearTimeout(this._timeout);
		this.div.parentNode.removeChild(this.div);
	}
	
//	window.addEventListener('error', function(e){
//		var messenger = new Message(e.message, 'error');
//		e.preventDefault();
//	});
	
	this.Message = Message;
	
	/**
	* handles the shrinking as a widget
	*/
	function ShrinkWidget(rootNode, imgLoaderWgt, opt){
		this._imgLoaderWgt = imgLoaderWgt;
		this._rootNode = rootNode;
		this._colorDepth = (opt && opt.colorDepth) ? opt.colorDepth : 2;
		this._displayColorDepth = (opt && opt.displaColorDepth) ? opt.displayColorDepth : 16;
		this._dithKern = (opt && opt.ditherKern) ? opt.detherKern : ""; //"TwoSierra";
		this._showTransparencyBackground = (opt && opt.showTransparencyBackground) ?  opt.showTransparencyBackground : true;
		
		var _t = this;
		
		// build the ui
		this._rootNode.className = this._rootNode.className + " shrinkerWidget";
		
		this._inputContainer = document.createElement("div");
		this._inputContainer.className = "shrinkInputs";
		
		
		// color depth of the image
		var txt = document.createTextNode("Image color depth: ");
		this._inputContainer.appendChild(txt);
		this._colorDepthNode = document.createElement("select");
		for(var i =0; i < 12; ++i){
			var option = document.createElement("option");
			option.value = i;
			option.text = Math.pow(2, i) + " colors";
			if (i == this._colorDepth){ option.selected = true; }
			this._colorDepthNode.appendChild(option);
		}
		this._inputContainer.appendChild(this._colorDepthNode);
		this._inputContainer.appendChild(document.createElement("br"));
		
		// select color depth for the display
		this._inputContainer.appendChild(document.createTextNode("Display has: "));
		this._displayColorDepthNode = document.createElement("select");
		[1,8,16,24].forEach(function(depth){
			var option = document.createElement("option");
			option.value = depth;
			option.text = depth + " bits (" + Math.pow(2, depth) + " colors)";
			if (depth == this._displayColorDepth){ option.selected = true; }
			_t._displayColorDepthNode.appendChild(option);
		}, this);
		this._inputContainer.appendChild(this._displayColorDepthNode);
		this._inputContainer.appendChild(document.createElement("br"));
		
		// dither select
		this._inputContainer.appendChild(document.createTextNode("Dither type: "));
		this._ditherTypeNode = document.createElement("select");
		var option = document.createElement("option");
		option.value = "none";
		option.text = "--none--"
		this._ditherTypeNode.appendChild(option);
		var q = new RgbQuant();
		for(var kernel in q.kernels) {
		   if (q.kernels.hasOwnProperty(kernel)) {
		   		var option = document.createElement("option");
				option.value = kernel;
				option.text = kernel;
				if (kernel == this._dithKern){ option.selected = true; }
				this._ditherTypeNode.appendChild(option);
		   }
		}
		this._inputContainer.appendChild(this._ditherTypeNode);
		this._inputContainer.appendChild(document.createElement("br"));
		this._inputContainer.appendChild(document.createTextNode(" Serpentine dithering "));
		this._ditherSerpentineNode = document.createElement("input");
		this._ditherSerpentineNode.type = "checkbox";
		this._ditherSerpentineNode.checked = false;
		this._inputContainer.appendChild(this._ditherSerpentineNode);
		this._inputContainer.appendChild(document.createElement("br"));
		
		// transparancy slider
		this._transparencyNode = document.createElement("input");
		this._transparencyNode.type = "range";
		this._transparencyNode.min = 0;
		this._transparencyNode.max = 255;
		this._transparencyNode.value = 128;
		this._inputContainer.appendChild(document.createTextNode("Transparency threshold: "));
		this._inputContainer.appendChild(this._transparencyNode);
		
		// show these
		this._rootNode.appendChild(this._inputContainer);
		
		
		// the canvasNode
		this._canvasNode = document.createElement("canvas");
		this._canvasNode.className = "displayCanvas";
		
		this._rootNode.appendChild(document.createTextNode("Show transparency background"));
		this._backgroundToggler = document.createElement("input");
		this._backgroundToggler.type = "checkbox";
		this._backgroundToggler.checked = this._showTransparencyBackground;
		this._rootNode.appendChild(this._backgroundToggler);
		this._rootNode.appendChild(document.createElement("br"));
		this._backgroundToggler.addEventListener("change", function(){
			_t._showTransparencyBackground = !_t._showTransparencyBackground;
			if (!_t._showTransparencyBackground) {
				_t._canvasNode.className += " whiteBackground";
			} else {
				_t._canvasNode.className = _t._canvasNode.className.replace(" whiteBackground", "");
			}
		}, false);
		
		// press button
		this._compressButtonNode = document.createElement("input");
		this._compressButtonNode.type = "button";	
		this._compressButtonNode.value = "Compress";
		this._compressButtonNode.className = "compressButton"
		this._compressButtonNode.addEventListener("click", function(){
			 _t.compress.call(_t); 
		}, false);
		this._rootNode.appendChild(this._compressButtonNode);
		
				// info nodes
		this._infoContainerNode = document.createElement("div");
		this._infoContainerNode.className = "info";
		this._paletteNode = document.createElement("div");
		this._infoContainerNode.appendChild(this._paletteNode);
		this._infoNode = document.createElement("div");
		this._infoNode.className = "fileinfo";
		this._infoContainerNode.appendChild(this._infoNode);
		this._rootNode.appendChild(this._infoContainerNode);
		
		
		
		this._rootNode.appendChild(this._canvasNode);
		
		
	}
	
	ShrinkWidget.prototype.compress = function(){
		var img = this._imgLoaderWgt.getItem();
		if(!img){
			new Message("Select a picture first");
			return;
		}
		var colorNr = Math.pow(2, this._colorDepthNode.value);
		//if (colorNr == 1)
		//	colorNr = 2;
		var opt = { colors: colorNr};
		var ditherKern = this._ditherTypeNode.value;
		var ditherSerp = this._ditherSerpentineNode.checked;
		if (ditherKern != "none") {
			opt.dithKern = ditherKern;
		}
		if (this._ditherSerpentineNode.checked) {
			opt.ditherSerp = ditherSerp;
		}
		
		try {
			document.body.style.cursor = "wait";
			var rgbquant = new RgbQuant(opt);
			
			// size the canvas to correct size
			var size = img.getSize()
	  		h = this._canvasNode.height = size.height;//parseInt(h.replace("px", ""));
	  		w = this._canvasNode.width = size.width; //parseInt(w.replace("px", ""));
	  		
	  		if (h > 1024 || w > 1024){
	  			new Message("Image is to big in size please scale it down first.", 'warn');
	  		}
	  		
	  		var htmlImg  = img.getImage();
	  			
			// let it sample the picture
			rgbquant.sample(htmlImg);
			
		
			// reduce it
			var reducedColors = rgbquant.reduce(htmlImg);
			
			
			
			this._makePalette(rgbquant.palette());
			
			// file compress it
			var eimg = new EImg({displayColorDepth:this._displayColorDepthNode.value,
	 						canvasNode: this._canvasNode});
	 		this._compressed = eimg.compress(reducedColors, w, parseInt(this._transparencyNode.value));
	 		new Message("Compressed to: " + this._compressed.length + "bytes  (" + (Math.round(this._compressed.length/10.24) / 100) + "kb)");
	 		this._updateInfo();
	 		
	 		if(!this._compressed.length)
				return;
	 		
	 		// display it the the user
	 		eimg.decompress(this._compressed); // renders implicitly if canvasNode is set when constructing object

			
		} catch(e) {
			new Message(e, 'warn')
		} finally {
			document.body.style.cursor = "";
		}
		
	}
	
	/**
	* shows the color plaette to the user
	*/
	ShrinkWidget.prototype._makePalette = function(colors){
		// clear old
//		var children = this._paletteNode.children;
//		while( children.length){
//			children[0].parentNode.removeChild(children[0]);
//		};
//		
//		for (var i = 0; i < colors.length; /*in code*/) {
//			var node = document.createElement("div");
//			node.className = "color"
//			node.style.backgroundColor = 'rgb(' + colors[i++] + ',' + colors[i++] + ', ' + colors[i++] + ')';
//			this._paletteNode.appendChild(node);
//		};
		
	}
	
	ShrinkWidget.prototype._updateInfo = function(){
		this._infoNode.innerHTML = this._imgLoaderWgt.getItem().getName() + ": " + this._compressed.length + 
									"b (" + (Math.round(this._compressed.length / 10) / 100) + "kb) &nbsp;";
		var link = document.createElement("a");
		link.href = "#_show_code";
		
		var _t = this;
		link.onclick = function(){ _t._showCode(); return false; }
		link.appendChild(document.createTextNode("get code"));
		this._infoNode.appendChild(link);
	}
	ShrinkWidget.prototype._showCode = function(){
		if (!this._compressed){ return; }
		
		var blocker = document.createElement("div");
		blocker.id = "blocker";
		var div = document.createElement("div");
		blocker.appendChild(div);
		var closer = document.createElement("span");
		closer.className = "closer";
		div.appendChild(closer);
		var txtArea = document.createElement("textarea");
		var name = this._imgLoaderWgt.getItem().getName().replace(/[\.\s\-\+]/g, "_");
		var src = "const unsigned char " + encodeURI(name) + "[" + 
							this._compressed.length  + "] = {";
							
		for (var i = 0, cols = 0, end = this._compressed.length; i < end; ++i, ++cols){
			src += "0x" + this._compressed[i].toString(16).toUpperCase();
			src += ((i +1) < end) ? "," : "";
			if (cols % 20 == 0) {
				src += "\n    ";
			}
		}
		txtArea.value = src + "};";
		
		div.appendChild(txtArea);
		
		function close(){
			if (blocker.parentNode)
				blocker.parentNode.removeChild(blocker);
		}
		
		blocker.addEventListener("click", close, false);
		closer.addEventListener("click", close, false);
		div.addEventListener("click", function(e){ e.preventDefault(); e.stopPropagation();}, false);
		
		document.body.appendChild(blocker);
	}
	
	this.ShrinkWidget = ShrinkWidget;
	
	
	/**
	* widget for file drops and image loading
	*/
	function ImageLoaderWidget(rootNode){
		this._rootNode = rootNode;
		
		var _t = this;
		
		// build the ui
		// filepicker
		this._rootNode.appendChild(document.createTextNode("Choose a image file.. (or drop onto page)"));
		this._filePicker = document.createElement("input");
		this._filePicker.type = "file";
		this._rootNode.appendChild(this._filePicker);
		this._rootNode.appendChild(document.createElement("br"));
		
		this._showContainer = document.createElement("div");
		this._showContainer.className = "showContainer notLoaded";
		
		this._showContainer.appendChild(document.createTextNode("Images"));
		this._showContainer.appendChild(document.createElement("br"));
		
		
		this._rootNode.appendChild(this._showContainer);
		
		var opt = {
		  readAsDefault: "DataURL",
		  dragClass: "dropTarget",
		  on: {
		  	beforestart: function(file){
		  		if (["image/jpeg", "image/bmp", "image/png", "image/gif", "image/tiff"].indexOf(file.type) == -1){
		  			new Message("Can't open a " + file.type + " file, not supported", 'warn');
		  			return false;
		  		}
		  	},
		    load: function(e, file){ _t._loadFile.call(_t, e, file); }
		  }
		};
		
		FileReaderJS.setupDrop(document.body, opt);
		FileReaderJS.setupInput(this._filePicker, opt);
		FileReaderJS.setupClipboard(this._rootNode, opt);
		
	}
	
	ImageLoaderWidget.prototype.fileName = function(){ return this._filePicker.files[0].name; }
	
	ImageLoaderWidget.prototype._loadFile = function(e, file){
		new ImageItem(e.target.result, file, this);
		this._showContainer.className = "showContainer";
	}

	ImageLoaderWidget.prototype.selectItem = function(item){
		if (this._selectedItem){
			this._selectedItem.setSelected(false);
		}
		this._selectedItem = item;
	}
	ImageLoaderWidget.prototype.unSelectItem = function(item){
		if (this._selectedItem){
			this._selectedItem.setSelected(false);
		}
	}
	ImageLoaderWidget.prototype.getItem = function(){
		if (this._selectedItem){
			return this._selectedItem;
		}
		return false;
	}
	
	/**
	* image loader widget item
	*/
	function ImageItem(base64, file, parent){
		this._file = file;
		this._size = {width: 0,  height: 0};
		this._name = file.name;
		this.parent = parent;
		this._rootNode = document.createElement("div");
		this._rootNode.className = "imageItem";
		this._imageNode = new Image();
		this._imageNode.src = base64;
		//this._imageNode.align = "left";
	  	this._imageNode.className = "icon";
		var _t = this;
		
		// find out the width and height of this
		this._imageNode.onload = function(){
	  		_t._size.width = _t._imageNode.naturalWidth; //;{height: parseInt(h.replace("px", "")), width: parseInt(w.replace("px", "")) }
	  		_t._size.height = _t._imageNode.naturalHeight;
	  		_t._infoNode.innerHTML += "width: " + _t._size.width + " height: " + _t._size.height;
		}
		
		this._infoNode = document.createElement("span");
		this._infoNode.innerHTML = "name: " + file.name + "<br/>size:" + file.size + "b (" + (Math.round(file.size / 10.24) / 100) + "kb)<br/>";
		this._rootNode.appendChild(this._imageNode);
		this._rootNode.appendChild(this._infoNode);
		this._closerNode = document.createElement("span");
		this._closerNode.addEventListener("click", function(){ _t.close.call(_t);},false);
		this._closerNode.className = "closer";
		this._rootNode.appendChild(this._closerNode);
		parent._rootNode.appendChild(this._rootNode);
		
		
		this._rootNode.addEventListener("click", function(){_t.onclick.call(_t);}, false);
		
		this.setSelected(true);
	}
	ImageItem.prototype.setSelected = function(selected){
		this._rootNode.className = selected ? "imageItem selected" : "imageItem";
		if (selected)
			this.parent.selectItem(this);
	}
	ImageItem.prototype.onclick = function(){
		this.setSelected(true);
	}
	ImageItem.prototype.getSrc = function(){
		return this._imageNode.src;
	}
	ImageItem.prototype.getImage = function(){
		return this._imageNode;
	}
	ImageItem.prototype.getSize = function(){
		return this._size;
	}
	ImageItem.prototype.getName = function(){
		return this._name;
	}
	ImageItem.prototype.close = function(){
		this.parent.unSelectItem(this);
		this._rootNode.parentNode.removeChild(this._rootNode);
	}
	
	
	// create the widgets
	document.addEventListener("DOMContentLoaded", function(){
		var imageLoaderNode = document.querySelector(".imageLoaderWidget");
		if (!imageLoaderNode) {
			return new Message("Cant find root node with classname imageLoaderWidget in html source", 'error');
		}
		window.ImageLoader = new ImageLoaderWidget(imageLoaderNode);
		
		
		var shrinkWidgetNode = document.querySelector(".shrinkWidget");
		if(!shrinkWidgetNode){
			return new Message("Cant find root node with classname shrinkWidget in html source", 'error');
		}
		window.Shrinker = new ShrinkWidget(shrinkWidgetNode, window.ImageLoader);
		
	
		
	});
	
}).call(this);
