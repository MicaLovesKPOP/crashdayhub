var li = $('li');
var liSelected;
$(window).keydown(function(e) {
    if(e.which === 40) {
        if(liSelected) {
            liSelected.removeClass('selected');
            next = liSelected.next();
            if(next.length > 0) {
                liSelected = next.addClass('selected');
            } else {
                liSelected = li.eq(0).addClass('selected');
            }
        } else {
            liSelected = li.eq(0).addClass('selected');
        }
    } else if(e.which === 38) {
        if(liSelected) {
            liSelected.removeClass('selected');
            next = liSelected.prev();
            if(next.length > 0) {
                liSelected = next.addClass('selected');
            } else {
                liSelected = li.eq(4).addClass('selected');
            }
        } else {
            liSelected = li.last().addClass('selected');
        }
    }
});

var currentMenu = 'main';

function openTools() {
    var x = document.getElementById("tools");
    var z = document.getElementById("main");
    z.style.display = "none";
    x.style.display = "flex";
    currentMenu = 'tools';
}

function openResources() {
    var x = document.getElementById("resources");
    var z = document.getElementById("main");
    z.style.display = "none";
    x.style.display = "flex";
    currentMenu = 'resources';
}

function openOptions() {
    var x = document.getElementById("options");
    var z = document.getElementById("main");
    z.style.display = "none";
    x.style.display = "flex";
    currentMenu = 'options';
}

function backPage() {
    if (currentMenu === 'main') {
        // do nothing, we're already on the main page
        return;
    }
    
    var x = document.getElementById(currentMenu);
    var z = document.getElementById("main");
    z.style.display = "flex";
    x.style.display = "none";
    currentMenu = 'main';
}

$(document).keyup(function(e) {
    if (e.keyCode === 27) {
        backPage();
    }
});

window.addEventListener("keyup", function(e){
    if(e.keyCode == 27) {
        undoLastChange();
    }
}, false);

$(window).mouseover(function() {
    if(liSelected) {
        liSelected.removeClass('selected');
        current = liSelected.current();
        liSelected = current.addClass('selected');
    }
});

$(document).keypress(function(e) {
    if (e.which == 13) {
        $('li.selected a').trigger('click');
    }
});

var element = $('div.flexbox-main');
function trapFocus(element) {
    var focusableEls = element.querySelectorAll('a[href]:not([disabled])');
    var firstFocusableEl = focusableEls[0];  
    var lastFocusableEl = focusableEls[focusableEls.length - 1];
    var KEYCODE_TAB = 9;
  
    element.addEventListener('keydown', function(e) {
        var isTabPressed = (e.key === 'Tab' || e.keyCode === KEYCODE_TAB);
  
        if (!isTabPressed) { 
            alert('Tab key pressed');
            return; 
        }
  
        if ( e.shiftKey ) /* shift + tab */ {
            if (document.activeElement === firstFocusableEl) {
                lastFocusableEl.focus();
                e.preventDefault();
            }
        } else /* tab */ {
        if (document.activeElement === lastFocusableEl) {
            firstFocusableEl.focus();
            e.preventDefault();
            }
        }
    });
}

// Makes escape key function as 'page back' function
// window.addEventListener("keyup", function(e){ if(e.keyCode == 27) history.back(); }, false);
