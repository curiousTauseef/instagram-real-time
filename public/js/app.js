(function() {
    var socket = io.connect(SOCKET_ENDPOINT);
    var overflowThreshold = 10;

    /**
     * [Namespacing]
     */
    var Insta = Insta || {};
    
    Insta.App = {

        /**
         * [Application initialization method / call for the methods being initializated in order]
         */
        init: function() {
            this.mostRecent();
            this.getData();
            this.mobileNav();
            
            var self = this;
            
            $(function(){
                $(window).resize(function() {
                    var w = $(document).width();
                    if( w >= 900 ) {
                        lastAnimate = $('#imgContent').find(':nth-child(1)').addClass('animated fadeInLeft');
                    }

                    if( w <= 900 ) {
                        lastAnimate = $('#imgContent').find(':nth-child(1)').addClass('animated fadeInDown');
                    }

                    self.pruneOverflow();
                });
                
                $(".fullscreenButton").on("click", function(event){
                    self.launchFullscreen(document.getElementById("imgContent"));
                });

                $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function(event){
                    if (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
                        // Fullscreen enabled
                        $(".fullscreenButton").hide();
                    } else {
                        // Fullscreen disabled
                        $(".fullscreenButton").show();
                    }
                });

                if(isAdmin) {
                    overflowThreshold = 100;
                    
                    $(".settingsButton")
                        .show()
                        .attr("href", window.location + "/settings");

                    $("body").css({
                        overflow: "auto",
                        overflowX: "hidden"
                    });
                }
            });
        },

        /**
         * [Interaction to open mobile navigation]
         */
        mobileNav: function() {
            var btMobNav = $('#js-mobNav'),
                nav = $('.nav');

            btMobNav.on('click', function(e) {
                e.preventDefault();
                if( !nav.hasClass('active') ) {
                    nav.addClass('active');
                } else {
                    nav.removeClass('active');
                }
            });

        },

        /**
         * [get data ajax and send to render method]
         */
        getData: function() {
            var self = this;
            socket.on("image", function(image){
                self.renderTemplate(image);
            });
            
            socket.on("remove", function(id){
                $("#imgContent .image[data-id='" + id + "']").remove();
            });
        },
        
        launchFullscreen: function(element) {
            if (element.requestFullScreen) {
                element.requestFullScreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.webkitRequestFullScreen) {
                element.webkitRequestFullScreen();
            }
        },
        
        pruneOverflow: function() {
            var viewportHeight = $(window).height();
            
            $("#imgContent .image")
                .filter(function(){
                    return $(this).offset().top > viewportHeight;
                })
                .slice(overflowThreshold)
                .remove();
        },

        /**
         * [Render the images on the page and check for layout resize]
         */
        renderTemplate: function(data) {
            var lastAnimate, lastSrc, nextSrc, last,
                w = $(document).width();

                var
                    query = data,
                    source = $('#mostRecent-tpl').html(),
                    compiledTemplate = Handlebars.compile(source),
                    result = compiledTemplate(query),
                    imgWrap = $('#imgContent'),
                    element = $(result.trim());
            
                if (isAdmin) {
                    element.on("click", function(){
                        // Lazy...
                        $.post(window.location.href + "/remove", {id: $(this).data("id")})
                        element.remove();
                    });
                }

                imgWrap.prepend(element);

                last = $('#imgContent').find(':first-child').removeClass('Hvh');

                if( w >= 900 ) {
                    lastAnimate = $('#imgContent').find(':nth-child(1)').addClass('animated fadeInLeft');
                }

                if( w <= 900 ) {
                    lastAnimate = $('#imgContent').find(':nth-child(1)').addClass('animated fadeInDown');
                }
            
                this.pruneOverflow();
        },

        /**
         * [ render most recent pics defined by subscribed hashtag ]
         */
        mostRecent: function() {
            var self = this;
            socket.on('firstShow', function (data) {
                var clean = $('#imgContent').find('.image').remove();
                data.forEach(function(image){
                    self.renderTemplate(image);
                });
            });
        }

    };

    Insta.App.init();

})(this);