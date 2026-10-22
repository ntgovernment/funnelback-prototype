$(document).ready(function() {
    
    $('.ntgc-table-loader-animation.profile').hide();

    $('#myProfile').click(function (event) {
        event.preventDefault();
        if (!$('.ntgc-profile').hasClass('active')) {
            $('body').addClass('profileopen shaded--outsideprofile');
            $('.ntgc-profile').addClass('active');
        }
        
        else {
            closeMenu();
        }
    });
    

    $('body').on("click", function(event){
        var profileOpen = $('body').hasClass('profileopen');
        if (!$(event.target).closest("#myProfile, .ntgc-profile").length) {
            closeMenu()
        }
    });

    $(document).on("keydown", function(event) {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    function closeMenu() {
        
        $('body').removeClass('shaded--outsideprofile');
        $('body').removeClass('profileopen');
        $('.ntgc-profile').removeClass('active');
        
        return;
    }    

    $(".phone-format").text(function(i, text) {
        text = text.replace(/(\d{2})(\d{4})(\d{4})/, "$1 $2 $3");
        return text;
    });
    
});









