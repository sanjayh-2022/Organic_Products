$(document).ready(function() {
    // Select all carousel elements with the class 'carousel'
    const multipleItemCarousels = document.querySelectorAll(".carousel");

    multipleItemCarousels.forEach(function(multipleItemCarousel) {
        const carousel = new bootstrap.Carousel(multipleItemCarousel, {
            interval: false
        });

        let carouselInner = $(multipleItemCarousel).find(".carousel-inner");
        let carouselItems = $(multipleItemCarousel).find(".carousel-item");
        let cardWidth = carouselItems.outerWidth(true); // Include margin in the width calculation
        let scrollPosition = 0;

        // Update widths on window resize
        $(window).resize(function() {
            cardWidth = carouselItems.outerWidth(true);
            scrollPosition = 0;
            carouselInner.scrollLeft(0); // Reset scroll position
        });

        $(multipleItemCarousel).find(".carousel-control-next").on("click", function() {
            if (scrollPosition < carouselInner[0].scrollWidth - carouselInner.width()) {
                scrollPosition = scrollPosition + cardWidth;
                carouselInner.animate({ scrollLeft: scrollPosition }, 600);
            }
        });

        $(multipleItemCarousel).find(".carousel-control-prev").on("click", function() {
            if (scrollPosition > 0) {
                scrollPosition = scrollPosition - cardWidth;
                carouselInner.animate({ scrollLeft: scrollPosition }, 600);
            }
        });

        // Prevent link click if it was a slide
        $(multipleItemCarousel).find('.carousel-item a').on('click', function(e) {
            if (isMoving) {
                e.preventDefault();
                isMoving = false;
            }
        });
    });

    const removeCarouselControls = function() {
        const viewportWidth = $(window).width();
        if (viewportWidth >= 300 && viewportWidth <= 480) {
            // Remove the carousel controls
            $('.carousel-control-prev, .carousel-control-next').remove();
        }
    };

    // Call the function on page load
    removeCarouselControls();

    // Call the function whenever the window is resized
    $(window).resize(removeCarouselControls);
});
