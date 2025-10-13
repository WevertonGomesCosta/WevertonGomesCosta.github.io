// --- Script para Validação e Envio do Formulário de Contato ---
(function() {
    document.addEventListener("DOMContentLoaded", () => {
        const form = document.getElementById("contact-form");
        if (!form) return;

        // --- Funções de Validação ---
        function showError(input, message) {
            const formGroup = input.parentElement;
            const errorElement = formGroup.querySelector('.error-message');
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.style.display = 'block';
            }
            input.classList.add('error');
        }

        function clearError(input) {
            const formGroup = input.parentElement;
            const errorElement = formGroup.querySelector('.error-message');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
            input.classList.remove('error');
        }

        function validateForm() {
            let isValid = true;
            const fields = ['name', 'email', 'subject', 'message'];
            fields.forEach(id => {
                const input = document.getElementById(id);
                if (!input) return;
                const errorKey = `form-${id}-error`;
                const isEmailInvalid = (id === 'email' && !/^\S+@\S+\.\S+$/.test(input.value));

                if (input.value.trim() === '' || isEmailInvalid) {
                    // Assume que 'translations' e 'currentLang' estão disponíveis globalmente
                    showError(input, translations[currentLang][errorKey]);
                    isValid = false;
                } else {
                    clearError(input);
                }
            });
            return isValid;
        }

        // --- Event Listener para Envio ---
        form.addEventListener("submit", async function handleSubmit(event) {
            event.preventDefault();
            const status = document.getElementById("form-status");
            if (!status) return;

            if (!validateForm()) {
                status.textContent = '';
                return;
            }

            const data = new FormData(event.target);
            // Assume que 'translations' e 'currentLang' estão disponíveis globalmente
            status.textContent = translations[currentLang].formSending;
            status.style.color = 'var(--accent)';

            try {
                const response = await fetch(event.target.action, {
                    method: form.method,
                    body: data,
                    headers: { 'Accept': 'application/json' }
                });
                if (response.ok) {
                    status.textContent = translations[currentLang].formSuccess;
                    status.style.color = 'var(--primary)';
                    form.reset();
                } else {
                    const responseData = await response.json();
                    const errorMessage = responseData["errors"]?.map(e => e["message"]).join(", ") || translations[currentLang].formError;
                    status.textContent = errorMessage;
                    status.style.color = 'var(--error)';
                }
            } catch (error) {
                status.textContent = translations[currentLang].formError;
                status.style.color = 'var(--error)';
            }
        });
    });
})();
