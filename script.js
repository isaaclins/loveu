document.addEventListener('DOMContentLoaded', () => {
    const background = document.querySelector('.background');
    const numberOfHearts = 80;
    const animationDuration = 10; // seconds

    for (let i = 0; i < numberOfHearts; i++) {
        createHeart();
    }

    function createHeart() {
    const heart = document.createElement('img');
    heart.src = 'resources/heart-emoji.png';
    heart.className = 'heart';
    
    const randomLeft = Math.random() * 100;
    const randomDelay = Math.random() * animationDuration;
    const randomTilt = Math.random() * 20 - 10; // Random tilt between -10 and 10 degrees
    const randomDuration = Math.random() * 5 + 5; // Random duration between 5 and 10 seconds

    heart.style.left = `${randomLeft}vw`;
    heart.style.bottom = `0`; // Start from the bottom of the screen
    heart.style.animationDelay = `${randomDelay}s`;
    heart.style.animationDuration = `${randomDuration}s`; // Set the animation duration
    heart.style.transform = `rotate(${randomTilt}deg)`;

    background.appendChild(heart);

    heart.addEventListener('animationiteration', () => {
        heart.style.left = `${Math.random() * 100}vw`;
    });
}
});
