/**
 * @file utils.js
 * @description Main script for UI interactivity, animations, and dynamic content handling.
 * @author Weverton C.
 * @version 2.0.0
 */

// --- Main Application Logic ---

const App = {
    /**
     * Initializes all UI-related functionalities after the DOM is fully loaded.
     */
    init() {
        // Wait for the DOM to be ready before running any scripts
        document.addEventListener('DOMContentLoaded', () => {
            this.updateFooterInfo();
            this.initScrollAnimations();
            this.initDynamicContentObserver();
            this.initEventListeners();
            
            // Initialize any external scripts or modules if they exist
            if (window.scholarScript && typeof window.scholarScript.init === 'function') {
                scholarScript.init();
            }
        });
    },

    /**
     * Updates dynamic information in the footer, like copyright year and last updated date.
     */
    updateFooterInfo() {
        const copyrightYearEl = document.getElementById('copyright-year');
        if (copyrightYearEl) {
            copyrightYearEl.textContent = new Date().getFullYear();
        }

        const lastUpdatedEl = document.getElementById('last-updated-date');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = new Date(document.lastModified).toLocaleDateString('pt-BR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }
    },

    /**
     * Sets up Intersection Observers for reveal-on-scroll animations and skill bar animations.
     * Also applies staggered delays to animations for a more dynamic effect.
     */
    initScrollAnimations() {
        // General purpose observer for elements that fade/slide in on scroll
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

        // Observer specifically for animating skill bars when they become visible
        const skillObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    const level = entry.target.dataset.level;
                    const bar = entry.target.querySelector('.skill-bar');
                    if (bar && level) {
                        bar.style.setProperty('--proficiency-level', level);
                    }
                    observer.unobserve(entry.target); // Animate only once
                }
            });
        }, { threshold: 0.5 });

        document.querySelectorAll('.skill-item').forEach(el => skillObserver.observe(el));

        // Add staggered animation delays to children of specified containers
        document.querySelectorAll('.stagger-children').forEach(container => {
            container.querySelectorAll('.reveal, .skill-item').forEach((child, index) => {
                child.style.setProperty('--stagger-index', index);
            });
        });

        // Observer for highlighting the active navigation link based on scroll position
        const sections = document.querySelectorAll('main > section[id]');
        const navLinks = document.querySelectorAll('nav .nav-link');
        const navObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    navLinks.forEach(link => {
                        link.classList.remove('active');
                        const href = link.getAttribute('href');
                        // Special condition for combined sections
                        if (href === `#${id}` || (id === 'licae-conecta' && (href === '#conecta' || href === '#licae'))) {
                            link.classList.add('active');
                        }
                    });
                }
            });
        }, { rootMargin: '-40% 0px -60% 0px' }); // Activates when section is in the middle of the viewport

        sections.forEach(section => navObserver.observe(section));
    },

    /**
     * Sets up a Mutation Observer to apply animations to content that is added to the DOM dynamically,
     * such as project cards or publications loaded via AJAX.
     */
    initDynamicContentObserver() {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        const mutationObserver = new MutationObserver((mutationsList) => {
            mutationsList.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    // Ensure we only process element nodes
                    if (node.nodeType === 1 && (node.matches('.project-card') || node.matches('.reveal'))) {
                        if (!node.classList.contains('reveal')) {
                            node.classList.add('reveal');
                        }
                        revealObserver.observe(node);
                    }
                });
            });
        });

        const projectsList = document.getElementById('projects-list');
        const publicationsGrid = document.getElementById('publicacoes-grid');

        if (projectsList) mutationObserver.observe(projectsList, { childList: true });
        if (publicationsGrid) mutationObserver.observe(publicationsGrid, { childList: true });
    },
    
    /**
     * Centralizes all event listener attachments for clarity and organization.
     */
    initEventListeners() {
        // --- Scroll Event Handling ---
        // Efficiently handles multiple scroll-based UI changes in one listener
        const nav = document.querySelector('nav');
        const header = document.querySelector('header');
        const body = document.body;
        const backToTopButton = document.querySelector('.back-to-top');
        
        if (nav && header) {
            const scrollThreshold = header.offsetHeight - 100;
            window.addEventListener('scroll', () => {
                const isScrolled = window.scrollY > scrollThreshold;
                nav.classList.toggle('scrolled', isScrolled);
                body.classList.toggle('scrolled', isScrolled);
                if (backToTopButton) {
                    backToTopButton.classList.toggle('visible', window.scrollY > 300);
                }
            }, { passive: true });
        }

        // --- Mousemove Event for Card Shine Effect ---
        document.body.addEventListener('mousemove', e => {
            const card = e.target.closest('.card');
            if (card) {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            }
        });

        // --- Click Event Delegation and Direct Bindings ---
        const timeline = document.querySelector('.timeline');
        if (timeline) {
            timeline.addEventListener('click', this.handleTimelineToggle);
        }

        const downloadCvBtn = document.getElementById('download-cv-btn');
        if (downloadCvBtn) {
            downloadCvBtn.addEventListener('click', this.handleCvDownload);
        }
        
        const copyEmailLink = document.getElementById('copy-email-link');
        if (copyEmailLink) {
            copyEmailLink.addEventListener('click', this.handleEmailCopy);
        }

        // --- Publication Search Functionality ---
        const pubSearchInput = document.getElementById('publication-search');
        const pubClearBtn = document.getElementById('publication-clear-btn');
        if (pubSearchInput && pubClearBtn) {
            const debouncedSearch = this.debounce(e => {
                if (window.scholarScript) {
                    scholarScript.renderPublications(e.target.value);
                }
            }, 250);

            pubSearchInput.addEventListener('input', debouncedSearch);

            pubClearBtn.addEventListener('click', () => {
                pubSearchInput.value = '';
                if (window.scholarScript) {
                    scholarScript.renderPublications();
                }
                pubSearchInput.focus();
            });
        }
    },

    /**
     * Handles expanding and collapsing timeline item details.
     * @param {Event} event - The click event object.
     */
    handleTimelineToggle(event) {
        const button = event.target.closest('.toggle-details-btn');
        if (!button) return;

        const item = button.closest('.timeline-item');
        item.classList.toggle('expanded');
        button.textContent = item.classList.contains('expanded') ? 'Ver menos' : 'Ver mais';
        
        const details = item.querySelector('.timeline-details');
        // If translation data is available, populate details on expand
        if (item.classList.contains('expanded') && window.translations && window.currentLang) {
            details.innerHTML = translations[currentLang][details.dataset.key] || '';
        }
    },

    /**
     * Handles the CV download request, checking for required dependencies.
     * @param {Event} event - The click event object.
     */
    handleCvDownload(event) {
        event.preventDefault();
        if (window.PdfGenerator && typeof window.PdfGenerator.generateCvPdf === 'function' && window.jspdf) {
            PdfGenerator.generateCvPdf();
        } else {
            console.error('PDF generator or jspdf library is not available.');
            App.showToast('Erro ao iniciar o gerador de PDF.');
        }
    },

    /**
     * Copies the specified email address to the clipboard and shows a confirmation toast.
     * @param {Event} event - The click event object.
     */
    handleEmailCopy(event) {
        event.preventDefault();
        const emailToCopy = 'wevertonufv@gmail.com';
        navigator.clipboard.writeText(emailToCopy).then(() => {
            App.showToast(`Email: ${emailToCopy} copiado!`);
        }).catch(err => {
            console.error('Failed to copy email: ', err);
            App.showToast('Falha ao copiar o email.');
        });
    },

    /**
     * Displays a short-lived notification message (toast).
     * @param {string} message - The message to display in the toast.
     */
    showToast(message) {
        const toast = document.getElementById('toast-notification');
        if (toast) {
            toast.textContent = message;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
    },

    /**
     * Creates a debounced version of a function that delays its execution.
     * @param {Function} fn - The function to debounce.
     * @param {number} wait - The delay in milliseconds.
     * @returns {Function} The new debounced function.
     */
    debounce(fn, wait = 250) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), wait);
        };
    }
};

// --- Initialize the Application ---
App.init();
