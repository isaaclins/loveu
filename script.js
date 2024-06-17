document.addEventListener('DOMContentLoaded', () => {
    const background = document.querySelector('.background');
    const numberOfHearts = 30;
    const animationDuration = 10; 

    for (let i = 0; i < numberOfHearts; i++) {
        createHeart();
    }
    function createHeart() {
    const heart = document.createElement('img');
    heart.src = 'resources/heart-emoji.png';
    heart.className = 'heart';
    
    const randomLeft = Math.random() * 100;
    const randomDelay = Math.random() * animationDuration;
    const randomTilt = Math.random() * 20 - 10;
    const randomDuration = Math.random() * 5 + 5;

    heart.style.left = `${randomLeft}vw`;
    heart.style.bottom = `0`; 
    heart.style.animationDelay = `${randomDelay}s`;
    heart.style.animationDuration = `${randomDuration}s`; 
    heart.style.transform = `rotate(${randomTilt}deg)`;

    background.appendChild(heart);

    heart.addEventListener('animationiteration', () => {
        heart.style.left = `${Math.random() * 100}vw`;
    });
}
});
