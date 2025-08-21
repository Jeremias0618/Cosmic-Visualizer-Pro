        function createStars() {
            const starsContainer = document.querySelector('.stars');
            for (let i = 0; i < 50; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                star.style.top = Math.random() * 100 + '%';
                star.style.left = Math.random() * 100 + '%';
                star.style.width = Math.random() * 3 + 1 + 'px';
                star.style.height = star.style.width;
                star.style.animationDelay = Math.random() * 3 + 's';
                star.style.animationDuration = (Math.random() * 2 + 2) + 's';
                starsContainer.appendChild(star);
            }
        }

        function createComets() {
            const solarSystem = document.querySelector('.solar-system');
            setInterval(() => {
                const comet = document.createElement('div');
                comet.className = 'comet';
                comet.style.top = Math.random() * 100 + '%';
                comet.style.left = Math.random() * 100 + '%';
                solarSystem.appendChild(comet);
                
                setTimeout(() => {
                    comet.remove();
                }, 15000);
            }, 8000);
        }

        function parallaxEffect() {
            const stars = document.querySelectorAll('.star');
            document.addEventListener('mousemove', (e) => {
                const mouseX = e.clientX / window.innerWidth;
                const mouseY = e.clientY / window.innerHeight;
                
                stars.forEach((star, index) => {
                    const speed = (index + 1) * 0.5;
                    const x = (mouseX - 0.5) * speed;
                    const y = (mouseY - 0.5) * speed;
                    star.style.transform = `translate(${x}px, ${y}px)`;
                });
            });
        }

        document.addEventListener('DOMContentLoaded', () => {
            createStars();
            createComets();
            parallaxEffect();
        });

        document.addEventListener('DOMContentLoaded', () => {
            const planets = document.querySelectorAll('.planet');
            planets.forEach(planet => {
                planet.addEventListener('mouseenter', () => {
                    planet.style.filter = 'brightness(1.5) drop-shadow(0 0 20px currentColor)';
                });
                
                planet.addEventListener('mouseleave', () => {
                    planet.style.filter = 'none';
                });
            });
        });