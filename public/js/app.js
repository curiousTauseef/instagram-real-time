(function() {
    var socket = io.connect(SOCKET_ENDPOINT);

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
            
            $(window).resize(function() {
                var w = $(document).width();
                if( w >= 900 ) {
                    lastAnimate = $('#imgContent').find(':nth-child(1)').addClass('animated fadeInLeft');
                }

                if( w <= 900 ) {
                    lastAnimate = $('#imgContent').find(':nth-child(1)').addClass('animated fadeInDown');
                }
                
                this.pruneOverflow();
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
            })
        },
        
        pruneOverflow: function() {
            var viewportHeight = $(window).height();
            
            $("#imgContent .image")
                .filter(function(){
                    console.log($(this).offset(), viewportHeight);
                    return $(this).offset().top > viewportHeight;
                })
                .slice(10)
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
                    imgWrap = $('#imgContent');

                imgWrap.prepend(result);

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