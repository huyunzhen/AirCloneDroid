////////////////////////////////////////////////////////////
//////////////////////////COMMON////////////////////////////
////////////////////////////////////////////////////////////
var dataSource = {
	/*
	contacts : '../../datas/testDataset/contacts.json',
	smsThreads : '../../datas/testDataset/smsThreads.json',
	sms : '../../datas/testDataset/sms.json',
	files : '../../datas/testDataset/files.json'
	*/
	contacts : 'datas/testDataset/contacts.json',
	smsThreads : 'datas/testDataset/smsThreads.json',
	sms : 'datas/testDataset/sms.json',
	files : 'datas/testDataset/files.json'
};
function getCharArray(){
	var charArray = [];
	for(var i = "A".charCodeAt(0); i <= "Z".charCodeAt(0); i++) {
		charArray.push(String.fromCharCode(i));
	}
	return charArray;
}
//jqAuto -- main binding (should contain additional options to pass to autocomplete)
//jqAutoSource -- the array to populate with choices (needs to be an observableArray)
//jqAutoQuery -- function to return choices
//jqAutoValue -- where to write the selected value
//jqAutoSourceLabel -- the property that should be displayed in the possible choices
//jqAutoSourceInputValue -- the property that should be displayed in the input box
//jqAutoSourceValue -- the property to use for the value
ko.bindingHandlers.jqAuto = {
    init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
        var options = valueAccessor() || {},
            allBindings = allBindingsAccessor(),
            unwrap = ko.utils.unwrapObservable,
            modelValue = allBindings.jqAutoValue,
            source = allBindings.jqAutoSource,
            query = allBindings.jqAutoQuery,
            valueProp = allBindings.jqAutoSourceValue,
            inputValueProp = allBindings.jqAutoSourceInputValue || valueProp,
            labelProp = allBindings.jqAutoSourceLabel || inputValueProp;

        //function that is shared by both select and change event handlers
        function writeValueToModel(valueToWrite) {
            if (ko.isWriteableObservable(modelValue)) {
				modelValue(valueToWrite );  
            } else {  //write to non-observable
				if (allBindings['_ko_property_writers'] && allBindings['_ko_property_writers']['jqAutoValue'])
					allBindings['_ko_property_writers']['jqAutoValue'](valueToWrite );    
            }
        }
        
        //on a selection write the proper value to the model
        options.select = function(event, ui) {
            writeValueToModel(ui.item ? ui.item.actualValue : null);
        };
            
        //on a change, make sure that it is a valid value or clear out the model value
        options.change = function(event, ui) {
            var currentValue = $(element).val();
            var matchingItem =  ko.utils.arrayFirst(unwrap(source), function(item) {
               return unwrap(inputValueProp ? item[inputValueProp] : item) === currentValue;   
            });
            if (!matchingItem) {
               writeValueToModel(null);
            }    
        }
        
        //hold the autocomplete current response
        var currentResponse = null;
            
        //handle the choices being updated in a DO, to decouple value updates from source (options) updates
        var mappedSource = ko.computed({
            read: function() {
                    mapped = ko.utils.arrayMap(unwrap(source), function(item) {
                        var result = {};
                        result.label = labelProp ? unwrap(item[labelProp]) : unwrap(item).toString();  //show in pop-up choices
                        result.value = inputValueProp ? unwrap(item[inputValueProp]) : unwrap(item).toString();  //show in input box
                        result.actualValue = valueProp ? unwrap(item[valueProp]) : item;  //store in model
                        return result;
                });
                return mapped;                
            },
            write: function(newValue) {
                source(newValue);  //update the source observableArray, so our mapped value (above) is correct
                if (currentResponse) {
                    currentResponse(mappedSource());
                }
            },
            disposeWhenNodeIsRemoved: element
        });
        
        if (query) {
            options.source = function(request, response) {  
                currentResponse = response;
                query.call(this, request.term, mappedSource);
            }
        } else {
            //whenever the items that make up the source are updated, make sure that autocomplete knows it
            mappedSource.subscribe(function(newValue) {
               $(element).autocomplete("option", "source", newValue); 
            });
            options.source = mappedSource();
        }
        
        //initialize autocomplete
        $(element).autocomplete(options);
    },
    update: function(element, valueAccessor, allBindingsAccessor, viewModel) {
       //update value based on a model change
       var allBindings = allBindingsAccessor(),
           unwrap = ko.utils.unwrapObservable,
           modelValue = unwrap(allBindings.jqAutoValue) || '', 
           valueProp = allBindings.jqAutoSourceValue,
           inputValueProp = allBindings.jqAutoSourceInputValue || valueProp;
        
       //if we are writing a different property to the input than we are writing to the model, then locate the object
       if (valueProp && inputValueProp !== valueProp) {
           var source = unwrap(allBindings.jqAutoSource) || [];
           var modelValue = ko.utils.arrayFirst(source, function(item) {
                 return unwrap(item[valueProp]) === modelValue;
           }) || {};             
       } 

       //update the element with the value that should be shown in the input
       $(element).val(modelValue && inputValueProp !== valueProp ? unwrap(modelValue[inputValueProp]) : modelValue.toString());    
    }
};
ko.bindingHandlers.jqAutoCombo = {
    init: function(element, valueAccessor) {
		var autoEl = $("#" + valueAccessor());
       
        $(element).click(function() {
			// close if already visible
            if (autoEl.autocomplete("widget").is(":visible")) {
                console.log("close");
                autoEl.autocomplete( "close" );
                return;
            }
			//autoEl.blur();
            console.log("search");
            autoEl.autocomplete("search", " ");
            autoEl.focus(); 
        });
    }  
}
////////////////////////////////////////////////////////////
//////////////////////////CONTACTS//////////////////////////
////////////////////////////////////////////////////////////
function initContactsView(){
	var cvm = new ContactsViewModel();
	ko.applyBindings(cvm, document.getElementById('contactsView'));
	
	loadContacts(cvm, function(){
		$("#contactsList li").each(function(index, element) {
			var letter = $(this).children().children('span').text().charAt(0);
			if ($("#letter"+letter).length < 1) {
				$("#contactsList").append($('<li class="groupLetter"><span id="letter'+letter+'">'+letter+'</span><ul></ul></li>'));
			}
			$(this).appendTo($("#letter"+letter).next());
		});
		$("#shortcut-contact a").click(function(){
			var c = $(this).text();
			console.log($("#letter"+c));
			$('.sidebar').animate({
				scrollTop: $("#letter"+c).offset().top - $("#contactsList").offset().top
			}, 'slow');
		});
	});
}
function loadContacts(viewModel, callback){
	$.getJSON(dataSource.contacts, function(datas) {
		viewModel.contacts.removeAll();
		for(key in datas){
			viewModel.addContact(datas[key]);
		}
		viewModel.sortContacts(datas[key]);
		
		if(typeof(callback) == "function")
			callback();
	});
}
function searchContacts(searchTerm, sourceArray){
	$.getJSON(dataSource.contacts, function(datas) {
		var result = [];
		for(key in datas){
			if(datas[key].name.substring(0,searchTerm.length) == searchTerm)
				result.push(datas[key]);
		}
		sourceArray(result);
	});
}	
function Contact(n, i, p, e){
	var self = this;
	self.id;
	self.name = n;
	self.contactImg = "graphics/seeContactImg.xhtml?contactId=0" || i;
	//if( Object.prototype.toString.call( p ) === '[object Array]' )
	self.phones = [] || p;
	self.emails = [] || e;
}
function ContactsViewModel(){
	var self = this;
	
	self.modeEnum = {
		READ : 0,
		CREATE : 1
	};
	self.currentMode = ko.observable(self.modeEnum.READ);
	self.setAddContactMode = function(){
		self.selectedContact(new Contact());
		self.currentMode(self.modeEnum.CREATE);
	};
	
	self.selectedContact = ko.observable();
	self.shortcuts = ko.observableArray(['#'].concat(getCharArray()));
	self.contacts = ko.observableArray([]);
	self.addContact = function(obj){
		self.contacts.push(obj);
	};
	self.select = function(contact){
		self.selectedContact(contact);
		self.currentMode(self.modeEnum.READ);
	};
	self.getContact = function(index){
		var i = null;
		if(typeof(index) == "function")
			i = index.call();
		else
			i = parseInt(index);
		if(i != NaN && i > 0)
			return self.contacts()[i];
		console.log(index);
		console.log("L'index doit �tre un entier positif.");
		return null;
	};
	self.sortContacts = function(){
		self.contacts.sort(function(a,b) {
			if (a.name < b.name)
				return -1;
			if (a.name > b.name)
				return 1;
			return 0;
		});
	};
	
	self.submitContact = function(formElement){
		var name = $('#name').val();
		var phone = $('#phone').val();
		var email = $('#email').val();
		var address = $('#address').val();
	 
		if(name !== '' && phone !== '' && email !== '' && address !== '') {
			$.ajax({
				url: $(formElement).attr('action'),
				type: $(formElement).attr('method'),
				data: $(formElement).serialize(),
				dataType: 'json', // JSON
				success: function(json) {
					if(json.success) {
						console.log('contact ajout�');
					} else {
						console.log('echec de l\'ajout');
					}
				},
				error: function(json) {
					console.log('fail');
				}
			});
		}
	};
};
////////////////////////////////////////////////////////////
/////////////////////////////SMS////////////////////////////
////////////////////////////////////////////////////////////
function initSmsView(){
	var smsVM = new SmsViewModel();
	ko.applyBindings(smsVM, document.getElementById('smsView'));
	
	loadSms(smsVM);
}
function loadSms(viewModel, callback){
	$.getJSON(dataSource.smsThreads, function(datas) {
		viewModel.threads.removeAll();
		for(key in datas){
			viewModel.addThread(datas[key]);
		}
		viewModel.sortThreads(datas[key]);
		
		if(typeof(callback) == "function")
			callback();
	});
}
function SmsViewModel(){
	var self = this;
	
	self.modeEnum = {
		READ_THREAD : 0,
		NEW_SMS : 1
	};
	self.currentMode = ko.observable(self.modeEnum.READ_THREAD);
	self.setNewSmsMode = function(){
		self.currentMode(self.modeEnum.NEW_SMS);
	};
	
	self.contacts = ko.observableArray();
	
	self.selectedThread = ko.observable();
	self.threads = ko.observableArray([]);
	self.addThread = function(obj){
		self.threads.push(obj);
	};
	self.selectThread = function(thread){
		self.selectedThread(thread);
		$.getJSON(dataSource.sms, function(datas){
			for(key in datas){
				if(datas[key].threadId == thread.id){
					console.log(datas[key]);
					self.currentChat(datas[key]);
				}
			}
		});
	};
	self.sortThreads = function(){
		self.threads.sort(function(a,b) {
			if (a.date < b.date)
				return -1;
			if (a.date > b.date)
				return 1;
			return 0;
		});
	};
	
	self.currentChat = ko.observable();
	
	self.selectedSms = ko.observable();
	self.sms = ko.observableArray([]);
	self.addSms = function(obj){
		self.sms.push(obj);
	};
	self.selectSms = function(sms){
		self.selectedSms(sms);
	};
	self.sortSms = function(){
		self.sms.sort(function(a,b) {
			if (a.date < b.date)
				return -1;
			if (a.date > b.date)
				return 1;
			return 0;
		});
	};
	
	self.submitSms = function(formElement){
		var smsText = $('#smsText').val();
	 
		if(smsText !== '') {
			$.ajax({
				url: $(formElement).attr('action'),
				type: $(formElement).attr('method'),
				data: $(formElement).serialize(),
				dataType: 'json', // JSON
				success: function(json) {
					if(json.success) {
						console.log('message envoy�');
					} else {
						console.log('echec de l\'envoie : ');
					}
				},
				error: function(json) {
					console.log('fail');
				}
			});
		}
	};
};
////////////////////////////////////////////////////////////
////////////////////////////FILES///////////////////////////
////////////////////////////////////////////////////////////
function initFilesView(){
	var filesVM = new SmsViewModel();
	ko.applyBindings(filesVM, document.getElementById('filesView'));
	
	loadFiles(filesVM);
}
function loadFiles(viewModel, callback){
	$.getJSON(dataSource.files, function(datas) {
		viewModel.files.removeAll();
		for(key in datas){
			viewModel.addFile(datas[key]);
		}
		viewModel.sortFiles(datas[key]);
		
		if(typeof(callback) == "function")
			callback();
	});
}
function FilesViewModel(){
	var self = this;

	self.fileSystem = ko.observableArray([]);
	
	self.selectedFolder = ko.observable();
	self.addFile = function(obj){
		self.fileSystem.push(obj);
	};
	self.selectFile = function(file){
		self.selectedFolder(file);
		$.getJSON(dataSource.sms, function(datas){
			for(key in datas){
				if(datas[key].threadId == file.id){
					console.log(datas[key]);
					self.currentChat(datas[key]);
				}
			}
		});
	};
	self.sortFileSystemItem = function(){
		self.fileSystem.sort(function(a,b) {
			if (a.date < b.date)
				return -1;
			if (a.date > b.date)
				return 1;
			return 0;
		});
	};
};