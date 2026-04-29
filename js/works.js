$(document).ready(function () {
    
    // === 페이지 전환 ===
    setTimeout(function() {
        $('#works-screen').addClass('active');
    }, 50);

    $('.back-btn').click(function () {
        window.location.href = 'main.html';
    });

    // ==========================================
    // 1. 스크롤 로직 (Contact 섹션 연동)
    // ==========================================
    let currentSectionIndex = 0;
    let isScrolling = false;
    
    const sections = document.querySelectorAll('.work-section');
    const worksContainer = document.querySelector('.works');

    function scrollToSection(index) {
        isScrolling = true;
        currentSectionIndex = index;

        // 도착한 섹션에만 'active' 클래스 부여 (Contact 카드 떠오르는 애니메이션 트리거!)
        sections.forEach((sec, i) => {
            if (i === index) {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });

        // 모든 팝업 초기화
        $('.vhs-item').removeClass('is-expanded');
        $('.graphic_item_wrap').removeClass('is-expanded');
        $('.dim-overlay').css({'opacity': '0', 'pointer-events': 'none'});

        // 앱 화면 열려있으면 닫기
        if($('#iphone_wrap').hasClass('is-opened')) {
            $('#iphone_wrap').removeClass('is-opened');
            clearInterval(window.appCarouselInterval);
            $('.app_screen_item').removeClass('is-playing');
            
            $('.app_text_item').removeClass('active');
            $('#text_default').addClass('active');
            
            $('.app_screen_item').removeClass('active');
            $('#screen_default').addClass('active');
        }

        // GNB 메뉴 활성화 연동
        $('.gnb ul li a').removeClass('active');
        // Contact 섹션은 index가 3이므로, 기존 GNB(0,1,2,3)에 맞게 불이 들어옵니다.
        $('.gnb ul li a').eq(index).addClass('active');

        const targetPosition = sections[index].offsetTop; 
        const startPosition = worksContainer.scrollTop;
        const distance = targetPosition - startPosition;
        const duration = 1000; 
        let startTime = null;

        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const run = easeInOutQuart(timeElapsed, startPosition, distance, duration);
            worksContainer.scrollTo(0, run);

            if (timeElapsed < duration) {
                requestAnimationFrame(animation);
            } else {
                worksContainer.scrollTo(0, targetPosition); 
                setTimeout(function(){ isScrolling = false; }, 300); 
            }
        }

        function easeInOutQuart(t, b, c, d) {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t * t * t + b;
            t -= 2;
            return -c / 2 * (t * t * t * t - 2) + b;
        }

        requestAnimationFrame(animation);
    }

    // Graphic 섹션의 내부 우측 스크롤 예외처리
    function isScrollableNested(e, direction) {
        const nestedContainer = $(e.target).closest('.work_result')[0]; 
        if (!nestedContainer) return false;

        const isAtTop = nestedContainer.scrollTop === 0;
        const isAtBottom = Math.ceil(nestedContainer.scrollTop + nestedContainer.clientHeight) >= nestedContainer.scrollHeight;

        if (direction === 'down' && !isAtBottom) return true; 
        if (direction === 'up' && !isAtTop) return true; 
        return false; 
    }

    worksContainer.addEventListener('wheel', function(e) {
        const direction = e.deltaY > 0 ? 'down' : 'up';
        if (isScrollableNested(e, direction)) return;
        
        e.preventDefault(); 
        if (isScrolling) return;

        if (direction === 'down' && currentSectionIndex < sections.length - 1) {
            scrollToSection(currentSectionIndex + 1); 
        } else if (direction === 'up' && currentSectionIndex > 0) {
            scrollToSection(currentSectionIndex - 1); 
        }
    }, { passive: false });

    let touchStartY = 0;
    worksContainer.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].clientY;
    }, { passive: false });

    worksContainer.addEventListener('touchmove', function(e) {
        const direction = touchStartY > e.touches[0].clientY ? 'down' : 'up';
        if (isScrollableNested(e, direction)) return;
        e.preventDefault(); 
    }, { passive: false });

    worksContainer.addEventListener('touchend', function(e) {
        if (isScrolling) return;
        const touchEndY = e.changedTouches[0].clientY;
        const direction = touchStartY > touchEndY ? 'down' : 'up';

        if (isScrollableNested(e, direction)) return;

        if (touchStartY - touchEndY > 50 && currentSectionIndex < sections.length - 1) {
            scrollToSection(currentSectionIndex + 1); 
        } else if (touchEndY - touchStartY > 50 && currentSectionIndex > 0) {
            scrollToSection(currentSectionIndex - 1); 
        }
    });

    $('.gnb ul li a').click(function(e) {
        e.preventDefault();
        const index = $(this).parent().index();
        if (!isScrolling && currentSectionIndex !== index) scrollToSection(index);
    });

    // ==========================================
    // 2. 비디오 테이프 클릭
    // ==========================================
    $('.vhs-side').click(function() {
        var $item = $(this).closest('.vhs-item');
        var $overlay = $(this).closest('.vhs-interaction-container').find('.dim-overlay');
        
        $('.vhs-item').removeClass('is-expanded');
        $item.addClass('is-expanded');
        $overlay.css({'opacity': '1', 'pointer-events': 'auto'});
    });

    $('.vhs-front').click(function() {
        const linkUrl = $(this).attr('data-link');
        if (linkUrl) window.open(linkUrl, '_blank'); 
    });


    // ==========================================
    // 3. App 섹션 탭 & 캐러셀 로직
    // ==========================================
    window.appCarouselInterval = null;

    $('.tabs .tab_link').click(function (e) {
        e.preventDefault();

        $('#iphone_wrap').addClass('is-opened');

        var tab_id = $(this).attr('data-tab'); 

        $('.app_text_item').removeClass('active');
        $("#text_" + tab_id).addClass('active');

        $('.app_screen_item').removeClass('active');
        var $targetScreen = $("#screen_" + tab_id);
        $targetScreen.addClass('active');

        clearInterval(window.appCarouselInterval);
        $targetScreen.removeClass('is-playing'); 
        
        setTimeout(function() {
            if ($targetScreen.hasClass('active')) {
                $targetScreen.addClass('is-playing');
                
                var $imgs = $targetScreen.find('.carousel_img');
                if ($imgs.length > 1) {
                    var currentIdx = 0;
                    
                    $imgs.removeClass('active');
                    $imgs.eq(currentIdx).addClass('active');

                    window.appCarouselInterval = setInterval(function() {
                        $imgs.eq(currentIdx).removeClass('active');
                        currentIdx = (currentIdx + 1) % $imgs.length;
                        $imgs.eq(currentIdx).addClass('active');
                    }, 2500);
                }
            }
        }, 800); 
    });

    $('#iphone_wrap').click(function(e) {
        if($(e.target).closest('.tabs').length) return;

        if($(this).hasClass('is-opened')) {
            $(this).removeClass('is-opened');
            clearInterval(window.appCarouselInterval);
            $('.app_screen_item').removeClass('is-playing');
            
            $('.app_text_item').removeClass('active');
            $('#text_default').addClass('active');
            
            $('.app_screen_item').removeClass('active');
            $('#screen_default').addClass('active');
        }
    });

    // ==========================================
    // 4. Graphic 섹션 팝업
    // ==========================================
    $('.graphic-thumbnail').click(function(e) {
        e.preventDefault(); 
        var $item = $(this).closest('.graphic_item_wrap');
        var $overlay = $('#graphic-dim-overlay');

        $('.graphic_item_wrap').removeClass('is-expanded');
        $item.addClass('is-expanded');
        $overlay.css({'opacity': '1', 'pointer-events': 'auto'});
    });

    $('.graphic_popup').click(function(e) {
        if (e.target === this) {
            $(this).closest('.graphic_item_wrap').removeClass('is-expanded');
            $('#graphic-dim-overlay').css({'opacity': '0', 'pointer-events': 'none'});
        }
    });

    $('.dim-overlay').click(function() {
        $('.vhs-item').removeClass('is-expanded');
        $('.graphic_item_wrap').removeClass('is-expanded');
        $(this).css({'opacity': '0', 'pointer-events': 'none'});
    });

});