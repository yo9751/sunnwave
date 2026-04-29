document.addEventListener('DOMContentLoaded', () => {
    const aboutScreen = document.getElementById('about-screen');
    const backBtn = document.querySelector('.back-btn');

    // 페이지가 로드되자마자 부드럽게 active 클래스를 추가하여 목업 애니메이션 실행
    setTimeout(() => {
        if(aboutScreen) aboutScreen.classList.add('active');
    }, 50);

    // Back 버튼 클릭 시 메인 페이지로 복귀
    if(backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'main.html';
        });
    }
});