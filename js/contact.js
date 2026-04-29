document.addEventListener('DOMContentLoaded', () => {
    
    const contactScreen = document.getElementById('contact-screen');
    const backBtn = document.querySelector('.back-btn');

    // 1. 진입 애니메이션 트리거
    // 아주 짧은 시간을 둔 뒤 .active 클래스를 추가하여
    // CSS에 걸려있는 contact_card의 translateY 애니메이션이 작동하도록 함
    setTimeout(() => {
        if(contactScreen) contactScreen.classList.add('active');
    }, 50);

    // 2. 뒤로가기 버튼 링크 연동
    if(backBtn) {
        backBtn.addEventListener('click', () => {
            // works 페이지 혹은 메인 페이지 등 원하는 곳으로 설정
            window.location.href = 'works.html'; 
        });
    }

});