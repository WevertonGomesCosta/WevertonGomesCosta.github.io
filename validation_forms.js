/**
 * @file validation_forms.js
 * @description Este script lida com a validação do formulário de contato e o envio assíncrono. Ele é executado quando o DOM está totalmente carregado.
 * @author Weverton C.
 * @version 2.2.0
 *
 * Dependências:
 * - Variáveis globais `translations` e `currentLang` para mensagens de texto.
 * - Uma estrutura HTML específica com os IDs 'contact-form', 'form-status', etc.
 */
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contact-form");
    if (!form) return;

    form.addEventListener("submit", async function handleSubmit(event) {
        event.preventDefault(); // Impede o envio padrão do formulário.
        const status = document.getElementById("form-status");

        // Valida o formulário antes de prosseguir.
        if (!validateForm()) {
            status.textContent = '';
            return;
        }

        const data = new FormData(event.target);
        // Assume que 'translations' e 'currentLang' são variáveis globais.
        status.textContent = translations[currentLang].formSending;
        status.style.color = 'var(--accent)';

        try {
            const response = await fetch(event.target.action, {
                method: form.method,
                body: data,
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (response.ok) {
                status.textContent = translations[currentLang].formSuccess;
                status.style.color = 'var(--primary)';
                form.reset();
            } else {
                const responseData = await response.json();
                status.textContent = responseData.errors?.map(e => e.message).join(", ") || translations[currentLang].formError;
                status.style.color = 'var(--error)';
            }
        } catch (error) {
            console.error("Erro no envio do formulário:", error);
            status.textContent = translations[currentLang].formError;
            status.style.color = 'var(--error)';
        }
    });

    /**
     * Valida os campos do formulário.
     * @returns {boolean} Retorna true se o formulário for válido.
     */
    function validateForm() {
        let isValid = true;
        const fields = ['name', 'email', 'subject', 'message'];
        fields.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            const errorKey = `form-${id}-error`;
            // Valida se o campo está vazio ou se o e-mail é inválido.
            if (input.value.trim() === '' || (id === 'email' && !/^\S+@\S+\.\S+$/.test(input.value))) {
                showError(input, translations[currentLang][errorKey]);
                isValid = false;
            } else {
                clearError(input);
            }
        });
        return isValid;
    }

    /**
     * Exibe uma mensagem de erro para um campo específico.
     * @param {HTMLElement} input O elemento do campo.
     * @param {string} message A mensagem de erro.
     */
    function showError(input, message) {
        const fg = input.parentElement;
        const errorElement = fg.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        input.classList.add('error');
    }

    /**
     * Limpa a mensagem de erro de um campo.
     * @param {HTMLElement} input O elemento do campo.
     */
    function clearError(input) {
        const fg = input.parentElement;
        const errorElement = fg.querySelector('.error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        input.classList.remove('error');
    }
});
