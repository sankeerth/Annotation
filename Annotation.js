var selectedContent = " ";

function returnAnnotatedText() {
    return selectedContent;
}

function Annotation () {
	this.isEditableNode = true;          //for checking if the node is textarea or input 
	this.ignoreWhiteSpace = true;        //ignoring when the selected part contains white space 
	this.tagName = "span";
	this.annotationClassName = "Annotation-element";    //applying css properties
    this.annotationNoteImage = document.images["note"];
}

Annotation.prototype = {
	checkForAnnotation: function() {
		this._isAnnotationApplied() ? this._removeAnnotation() : this._applyAnnotation();
        return this.selectedText;
	},

	_isAnnotationApplied: function() {
		var selection = window.getSelection();
		var ranges = this._getSelectionRanges(selection);
		this.selectedText = ranges.toString();
        selectedContent = this.selectedText;
		var rangeLength = ranges.length;
		while (rangeLength--) {
			this.range = ranges[rangeLength];
			if(!this._isAnnotationAppliedToRange(ranges[rangeLength]))
				return false;
		}
		return true;
	},

	/** 
    @param {Selection} selection
	*/
	_getSelectionRanges: function(selection) {
		this.ranges = [];
		for (var i = 0; i < selection.rangeCount; i++)
			this.ranges[i] = selection.getRangeAt(i);
		return this.ranges;
	},

	/** 
    @param {Range} range
	*/
	_isAnnotationAppliedToRange: function(range) {
		if(range.collapsed || range.toString() == "")
			return false;
		var container = [];
		container.push(range.startContainer, range.endContainer);
		for (var i = 0; i < container.length; ++i) {
			if (!this._isEnclosedWithinAnnotationClass(container[i]))
				return false;
	    }
	    return true;
	},

	/** 
    @param {Range.Container} container
	*/
	_isEnclosedWithinAnnotationClass: function(container) {
		while(container) {
			if (container.nodeType == 1) {
				if (this._compare(this.tagName, container.tagName.toLowerCase()))
					return this._compare(this.annotationClassName, container.className);
			}
			container = container.parentNode;
		}
		return false;
	},

	_compare: function(a, b) {
		if (a === b)
			return true;
		return false;
	},

	_applyAnnotation: function() {
		var ranges = this.ranges;
		for (var i = 0; i < ranges.length; ++i) {
			this.startContainer = this.ranges[i].startContainer;
			this.endContainer = this.ranges[i].endContainer;
			this._applyAnnotationToRange(ranges[i]);
		}		
		return ranges;
	},

	/** 
    @param {Range} range
	*/
	_applyAnnotationToRange: function(range) {
		var container_array = this._arrayOfContainers(range);
		var modifiedContainers =  this._splitBoundaries(range);
		if (range.startContainer != range.endContainer) {
			var childNodes_array = this._splitSelectedTextIntoNodes(this.range, []);
			var nodesToAnnotate = this._getAnnotationNodes(range, childNodes_array);
			this._annotateAllNodes(nodesToAnnotate, nodesToAnnotate.length);
		} else
			this._annotate(modifiedContainers[0]);
		this._addAnnotationNote();
	},

	/** 
    @param {Range} range
	*/
	_arrayOfContainers: function(range) {
		var array = [];
		for (var i = 0; i < this.ranges.length; ++i)
			array.push({node: range.startContainer, offset: range.startOffset}, {node: range.endContainer, offset: range.endOffset});
		return array;
	},

	/** 
    @param {Range} range
	*/
	_splitBoundaries: function(range) {
		if (range.endContainer.nodeType == 3 || 4 || 8 && range.endoffset > 0 && range.endOffset < range.endContainer.length) {
			var selectedTextInEndContainer = this._splitSelectedText(range.endContainer, range.endOffset, true);
			var selectedTextInStartContainer = this._splitSelectedText(range.startContainer, range.startOffset, false);
		}
		return [selectedTextInEndContainer, selectedTextInStartContainer];
	},


	//this function needs to be refactored to consider all boundary conditions

	/** 
    @param {Range.Container} container
    @param {number} offset
    @param {boolean} isSelectedTextWithinContainer
	*/
	_splitSelectedText: function(container, offset, isSelectedTextWithinContainer) {
		var clonedNode = container.cloneNode(false);
		if (isSelectedTextWithinContainer) {
			clonedNode.deleteData(0, offset);
			container.deleteData(offset, container.length - offset);
		} else {
			clonedNode.deleteData(offset, container.length - offset);
			container.deleteData(0, offset);
		}

		var next_sibling = container.nextSibling;
		var parentNode = container.parentNode;

        if (!isSelectedTextWithinContainer) {
        	parentNode.insertBefore(clonedNode, container);
        	return container;
    	}
		if (next_sibling)
			parentNode.insertBefore(clonedNode, next_sibling);
		else
        	parentNode.appendChild(clonedNode);
		return container;
	},

	/** 
    @param {Range} range
    @param {Array.<node>} childNodes_array
	*/
	_splitSelectedTextIntoNodes: function(range, childNodes_array) {
		var ranges = document.createRange();
		var ancestorNode = range.commonAncestorContainer;
		for (var i = 0; i < ancestorNode.childNodes.length; ++i) {
			ranges.selectNodeContents(ancestorNode.childNodes[i]);
			if (ranges.compareBoundaryPoints(range.END_TO_START, range) < 1 &&
         		ranges.compareBoundaryPoints(range.START_TO_END, range) > -1) {
				childNodes_array.push(ancestorNode.childNodes[i]);
      		}
		}
		return childNodes_array;
	},

	/** 
    @param {Range} range
    @param {Array.<node>} childNodes_array
	*/
	_getAnnotationNodes: function(range, childNodes_array) {
		var textNodes = [];
		var checkForCharacters = new RegExp("[A-Za-z0-9_]");    //try to combine the regExp's into one
		this._recursivelyPush(childNodes_array, childNodes_array.length, textNodes, checkForCharacters);
		return textNodes;
	},

	/** 
    @param {Array.<node>} childNodes_array
	@param {number} length
    @param {Array.<node>} textNodes
    @param {RegExp} checkForCharacters
	*/
	_recursivelyPush: function(childNodes_array, length, textNodes, checkForCharacters) {
		for (var i = 0; i < length; ++i) {
			if (childNodes_array[i].nodeType != 1 && checkForCharacters.test(childNodes_array[i].textContent))  //checks only if not an element. check for text node might be needed
				textNodes.push(childNodes_array[i]);
			else
				this._recursivelyPush(childNodes_array[i].childNodes, childNodes_array[i].childNodes.length, textNodes, checkForCharacters)
		}
	},

	/** 
    @param {Array.<node>} nodesToAnnotate
	@param {number} length
	*/
	_annotateAllNodes: function (nodesToAnnotate, length) {
		var i = 0;
		while (nodesToAnnotate[i] != this.startContainer && i < length)
			i++;
		for ( ; i < length; ++i) {
			if (nodesToAnnotate[i].parentNode.className == this.annotationClassName) {
                var textNodesArray = [];
                for (var j = 0; j < nodesToAnnotate[i].parentNode.childNodes.length; ++j)
                    textNodesArray.push(nodesToAnnotate[i].parentNode.childNodes[j].textContent);
                nodesToAnnotate[i].deleteData(0, nodesToAnnotate[i].length);
                var text = textNodesArray.join("");
                nodesToAnnotate[i-1].data.replace(nodesToAnnotate[i-1].data, text);
                //incomplete
				// join the split text nodes present within one span element
			} else
				this._annotate(nodesToAnnotate[i]);

			if (nodesToAnnotate[i] == this.endContainer)
				return;
		}
	},
    
    _annotate: function(node) {
        this.annotationElement = new AnnotationElement('yellow');
        var spanElement = this.annotationElement.getElement(this);
		node.parentNode.insertBefore(spanElement, node);
		spanElement.appendChild(node);
    },
    
    _addAnnotationNote: function() {
        var spanElement = this.endContainer.parentNode;
        var note = this.annotationElement.createNote(spanElement);
        document.body.appendChild(note);
    },

	_removeAnnotation: function() {
		var ranges = this.ranges;
		for (var i = 0; i < ranges.length; ++i) {
            this.startContainer = this.ranges[i].startContainer;
			this.endContainer = this.ranges[i].endContainer;
			this._removeAnnotationFromRange(ranges[i]);
        }
	},

	/** 
    @param {Range} range
	*/
	_removeAnnotationFromRange: function (range) {
        var container_array = this._arrayOfContainers(range);
		var modifiedContainers =  this._splitBoundaries(range);
		if (range.startContainer != range.endContainer) {
			var childNodes_array = this._splitSelectedTextIntoNodes(this.range, []);
			var nodesToAnnotate = this._getAnnotationNodes(range, childNodes_array);
			this._removeAnnotationFromNodes(nodesToAnnotate, nodesToAnnotate.length);
		} else {
			var parentNode = modifiedContainers[0].parentNode.parentNode;
            var previousSibling = modifiedContainers[0].parentNode.previousSibling;
            var spanElement = modifiedContainers[0].parentNode;
            this._remove(modifiedContainers[0], spanElement, parentNode, previousSibling);
        }
	},
    
    _removeAnnotationFromNodes: function(nodes, length) {
        for (var i = 0; i < length; ++i) {
            var parentNode = nodes[i].parentNode.parentNode;
            var previousSibling = nodes[i].parentNode.previousSibling;
            var spanElement = nodes[i].parentNode;
            var textNode = nodes[i];
            this._remove(textNode, spanElement, parentNode, previousSibling);
        }
    },
    
    _remove: function(text, node, parent, previous){
        if (previous)
            parent.insertBefore(text, node);
        else
            parent.appendChild(text);
        parent.removeChild(node);
    }
}

function AnnotationElement(color) {
    this.color = color;
    this.className = "annotation";
}

AnnotationElement.prototype = {
    get id() {
        if (typeof this.id == 'undefined')
            this.id = 12456;
        else
            return this.id++;
    },

    _getOffsetValues: function(element) {
        return {left: element.offsetLeft, top: element.offsetTop, width: element.offsetWidth, height: element.offsetHeight};
    },
    
    getElement: function(annotation) {
        this.annotation = annotation;
        var element = document.createElement('span');
        element.id = "Annotation-element";
        element.className = "Annotation-element";
        element.style.backgroundColor = this.color;
        return element;
    },

    createNote: function(element) {
		var noteElement = document.createElement('div');
        icon = this._createNoteIcon(element, noteElement);
        var id = extractId(icon.id);
        noteElement.id = "Annotation-note-" + id[0];
		noteElement.className = "Annotation-note";
        this._addStyleToNote.bind(noteElement) ();
        var titleArea = document.createElement('div');
        titleArea.className = "Annotation-note-title";
        this._addStyleToTitle.bind(titleArea) ();
        noteElement.appendChild(titleArea);
        var headerArea = document.createElement('div');
        headerArea.className = "Annotation-note-header";
        this._addStyleToHeader.bind(headerArea) ();
        titleArea.appendChild(headerArea);
        var cancelButton = document.createElement('div');
        cancelButton.className = "Annotation-note-cancel-button";
        this._addStyleToButton.bind(cancelButton, 2, 110, 14, 14, "http://107.108.218.61/Annotation/cancel.png") ();
        cancelButton.setAttribute("onclick","cancel()");
        //cancelButton.addEventListener("click", this.deleteNote.bind(noteElement, this.removeIcon.bind(icon)));
        headerArea.appendChild(cancelButton);
        var minimizeButton = document.createElement('div');
        minimizeButton.className = "Annotation-note-minimize-button";
        this._addStyleToButton.bind(minimizeButton, 0, 70, 14, 14, "http://107.108.218.61/Annotation/minimize.png") ();
        minimizeButton.setAttribute("onclick","minimize()");
        headerArea.appendChild(minimizeButton);
        var contentArea = document.createElement('div');
        contentArea.setAttribute("contentEditable", true);
        contentArea.className = "Annotation-note-content";
        //contentArea.contentEditable = "true";
        this._addStyleToContent.bind(contentArea) ();
        //contentArea.addEventListener("click", this._changeToTextAreaOnFocus.bind(this, contentArea));
        noteElement.appendChild(contentArea);
        this._setNotePosition(noteElement, icon);
        return noteElement;
	},

    _addStyleToNote: function() {
        this.style.position = "absolute";
        this.style.height = "75px";
        this.style.width = "160px";
        this.style.zIndex = "9995";
        this.style.border = "1px solid #5E5E5E";
        this.style.overflow = "visible";
        this.style.boxShadow = "2px 3px 3px #888";
        this.style.borderRadius = "5px";
        this.style.lineHeight = "1.0em";
        this.style.backgroundColor = "rgb(252, 252, 220)";
        this.style.visibility = "hidden";
    },
    
    _addStyleToTitle: function() {
        this.style.borderBottom = "1px solid rgb(236, 151, 151)";
    },
    
    _addStyleToHeader: function() {
        this.style.display = "inline-block";
        this.innerHTML = "Note:"
        this.style.position = "relative";
        this.style.left = "0px";
        this.style.height = "16px";
        this.style.fontFamily = "cursive";
        //this.style.borderBottom = "1px solid rgb(236, 151, 151)";
        this.style.fontSize = "12px";
    },
    
    _addStyleToButton: function(top, right, width, height, url) {
        this.style.display = "inline-block";
        this.style.position = "relative";
        this.style.top = top + "px";
        this.style.left = right + "px";
        this.style.width = width + "px";
        this.style.height = height + "px";
        this.style.backgroundImage = "url(" + url + ")";;
    },
    
    _addStyleToContent: function() {
        this.style.position = "relative";
        this.style.display = "inline-block";
        this.style.top = "0px";
        this.style.left = "1px";
        this.style.right = "1px";
        this.style.width = "158px";
        this.style.height = "56px";
        this.style.outline = "none";
        this.style.border = "none";
        this.style.backgroundColor = "transparent";
        this.style.resize = "none";
    },
    
    _createNoteIcon: function(element, noteElement) {
        var noteIcon = document.createElement('span');
        var img = document.createElement('img');
        img.src = "http://107.108.218.61/Annotation/note.png";
        noteIcon.appendChild(img);
        console.log("calling count");
        noteIcon.id = "note-icon-" + count();
        noteIcon.style.position = "absolute";
        offsetValues = this._getOffsetValues(element);
        noteIcon.style.left = offsetValues.left + offsetValues.width;
        noteIcon.style.top = offsetValues.top - 3;
        if (element.nextSibling == null)                        //take care of link
            element.parentNode.appendChild(noteIcon);
        else
            element.parentNode.insertBefore(noteIcon, element.nextSibling);
        noteIcon.setAttribute("onclick","show()");
        return noteIcon;
    },

	_setNotePosition: function(noteElement, noteIcon) {
        var offsetValues = this._getOffset(noteIcon);
        noteElement.style.left = offsetValues.left + "px";
        noteElement.style.top = offsetValues.top + "px";
	},
    
    _changeToTextAreaOnFocus: function(contentDiv) {
        var content = contentDiv.innerHTML;
        var textArea = document.createElement('textarea');
        this._addStyleToContent.bind(textArea) ();
        var parent = contentDiv.parentNode;
        parent.replaceChild(textArea, contentDiv);
        textArea.focus();
        textArea.value = content;
        textArea.addEventListener("blur", this._changeToDivOnblur.bind(this, textArea));
    },
    
    _changeToDivOnblur: function(textArea) {
        var content = textArea.value;
        var note = textArea.parentNode;
        var id = extractId(note.id);
        console.log(id);
        console.log("Adding to note list");
        //previewObj.addToNoteList(id[0], content);
        var divElement = document.createElement('div');
        this._addStyleToContent.bind(divElement) ();
        divElement.innerHTML = content;
        divElement.style.wordWrap = "break-word";
        divElement.style.overflow = "auto";
        divElement.style.overflowX = "auto";
        divElement.style.fontFamily = "monospace";
        divElement.addEventListener("click", this._changeToTextAreaOnFocus.bind(this, divElement));
        var parent = textArea.parentNode;
        parent.replaceChild(divElement, textArea);
    },
    
    _getOffset: function(noteIcon) {
        var totalLeft = 0;
        var totalTop = 0;

        for (var element = noteIcon; element; element = element.offsetParent) {
            totalLeft += element.offsetLeft;
            totalTop += element.offsetTop;
            /*if (noteIcon !== element) {
                totalLeft += element.clientLeft - element.scrollLeft;
                totalTop += element.clientTop - element.scrollTop;
            }*/
        }
        return { left: totalLeft, top: totalTop };
    },
    
    showNote: function(noteElement) {
        this.style.visibility = "visible";
	},

	hideNote: function() {
        this.style.visibility = "hidden";
	},
    
    deleteNote: function(callback) {
        var parent = this.parentNode;
        parent.removeChild(this);
        callback();
    },
    
    removeIcon: function (icon) {
        var parent = this.parentNode;
        parent.removeChild(this);
    }
}

function count() {
    if ( this.counter == undefined ) {
        this.counter = 0;
    }
    var c = ++this.counter;
    console.log("count " + c);
    return c;
}
function extractId(elementId) {
    console.log("extracting Id " + elementId);
    var regex = /\d+/;
    var id = elementId.match(regex);
    return id;
}

var attachScript = function(url, src) {
    var s = document.createElement("script");
    s.type = "text/javascript";
    s.src = url || null;
    s.innerHTML = src || null;
    document.getElementsByTagName("head")[0].appendChild(s);
};

function addScript() {
    attachScript(null, 
        function show() {
            icon = event.currentTarget;
            var id = extractId(icon.id);
            console.log(id);
            var note = document.getElementById("Annotation-note-" + id[0]);
            note.style.visibility = "visible";
        }
    );
    
    attachScript(null, 
        function extractId(elementId) {
            console.log("extracting Id" + elementId);
            var regex = /\d+/;
            var id = elementId.match(regex);
            return id;
        }
    );
    
    attachScript(null, 
        function minimize() {
            var button = event.srcElement;
            var note = button.parentNode.parentNode.parentNode;
            note.style.visibility = "hidden";
        }
    );
    
    attachScript(null, 
        function cancel() {
            var button = event.srcElement;
            var note = button.parentNode.parentNode.parentNode;
            var id = extractId(note.id);
            var icon = document.getElementById("note-icon-" + id[0]);
            console.log(icon);
            console.log('removing icon');
            icon.parentNode.removeChild(icon);
            console.log('removing note');
            document.body.removeChild(note);
        }
    );
}

var annotate = new Annotation();
annotate.checkForAnnotation();
addScript();
returnAnnotatedText();