//$('a').mouseover(function() {
//    $(this).focus();
//    $(this).hover();
//});

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
                liSelected = li.eq(3).addClass('selected');
            }
        } else {
            liSelected = li.last().addClass('selected');
        }
    }
});

//onclick = "openTools();"
//onkeydown = "openTools();" //why do these not do anything?

function openTools() {
    var x = document.getElementById("tools");
    var z = document.getElementById("main");
    z.style.display = "none";
    x.style.display = "flex";
//    next = liSelected.next();
//    liSelected = next.addClass('selected');
//    liSelected = li.eq(0).addClass('selected');
}

$(window).mouseover(function() {
    if(liSelected) {
        liSelected.removeClass('selected');
        current = liSelected.current();
        liSelected = current.addClass('selected');
    }
});

function openResources() {
    var x = document.getElementById("resources");
    var z = document.getElementById("main");
    z.style.display = "none";
    x.style.display = "flex";
}

$(document).keypress(function(e) {
    if (e.which == 13) {
        alert('Enter key pressed');
        $('li.selected a').trigger('click');
    }
});

function trapFocus(element) {
    var focusableEls = element.querySelectorAll('a[href]:not([disabled])');
    var firstFocusableEl = focusableEls[0];  
    var lastFocusableEl = focusableEls[focusableEls.length - 1];
    var KEYCODE_TAB = 9;
  
    element.addEventListener('keydown', function(e) {
      var isTabPressed = (e.key === 'Tab' || e.keyCode === KEYCODE_TAB);
  
      if (!isTabPressed) { 
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
