(function () {
    const translations = {
        es: {
            app_title: "GensokyoNet",
            app_subtitle: "Intranet Libre para la Comunidad de Touhou",
            nav_new_tab: "Nueva Pestaña",
            nav_sidebar_toggle: "Ocultar / Mostrar barra lateral (Ctrl+B)",
            nav_back: "Atrás",
            nav_forward: "Adelante",
            nav_reload: "Recargar",
            nav_home: "Inicio",
            nav_bookmarks: "Favoritos",
            nav_add_bookmark: "Agregar a favoritos",
            nav_remove_bookmark: "Quitar de favoritos",
            nav_url_placeholder: "Escribe un dominio o busca algo...",
            nav_go: "Ir",
            tab_search: "Búsqueda",
            side_hide: "Ocultar Barra",
            side_home: "Inicio",
            side_claim: "Reclamar Dominio",
            side_builder: "Creador Web",
            side_passport: "Pasaporte de Gensokyo",
            side_styles: "Estilos Touhou",
            side_support: "Soporte y Contacto",
            sd_search_placeholder: "Buscar en la red...",
            sd_search_btn: "Buscar",
            sd_claim_title: "RECLAMAR DOMINIO",
            sd_claim_sub: "Crea tu propio rincón",
            sd_history_title: "HISTORIAL",
            sd_history_sub: "Registro de Navegación",
            sd_builder_title: "CREADOR WEB",
            sd_builder_sub: "Escribe tu propio rincón",
            sd_localhost_title: "DEV LOCALHOST",
            sd_localhost_sub: "Probar Servidor Local",
            modal_prefs_title: "Preferencias de GensokyoNet",
            modal_lang_title: "Idioma / Language",
            lang_es: "🇪🇸 Español",
            lang_es_sub: "Predeterminado",
            lang_en: "🇬🇧 English",
            lang_en_sub: "Inglés",
            lang_pt: "🇧🇷 Português",
            lang_pt_sub: "Portugués",
            modal_theme_title: "Estilo visual",
            theme_scarlet: "Scarlet Mist",
            theme_scarlet_sub: "TH06 Modo Pergamino",
            theme_haku: "Hakugyokurou",
            theme_haku_sub: "TH07 Modo Oscuro",
            modal_policy_title: "Navegación al Mundo Exterior",
            policy_ask: "Preguntar antes de acceder a dominios externos",
            policy_auto: "Permitir navegación automática al Mundo Exterior",
            policy_block: "Bloquear acceso a la web externa",
            passport_title: "PASAPORTE DE GENSOKYO • IDENTIDAD CENTRAL",
            passport_change_avatar: "Cambiar foto de perfil desde tu PC",
            passport_unregistered: "Cuenta Sin Registrar",
            passport_registered: "Identidad Autenticada",
            passport_register_btn: "Registrarse",
            passport_login_btn: "Iniciar Sesión",
            passport_logout_btn: "Cerrar Sesión",
            passport_my_domains: "MIS DOMINIOS REGISTRADOS",
            passport_no_domains: "No tienes dominios registrados aún.",
            passport_oauth_title: "API Token OAuth (Gensokyo ID)",
            passport_copy_token: "COPIAR TOKEN",
            passport_token_copied: "¡TOKEN COPIADO!",
            reg_modal_title: "Registrar Cuenta • Pasaporte de Gensokyo",
            reg_username_label: "Nombre de Usuario",
            reg_username_help: "Tu apodo principal en la intranet de GensokyoNet.",
            reg_password_label: "Contraseña",
            reg_password_help: "Debe cumplir con el estándar de mínimo 8 caracteres.",
            reg_confirm_password_label: "Confirmar Contraseña",
            reg_confirm_password_help: "Ingresa exactamente la misma contraseña.",
            reg_submit_btn: "Crear Cuenta",
            reg_cancel_btn: "Cancelar",
            login_modal_title: "Iniciar Sesión • Pasaporte de Gensokyo",
            login_username_label: "Nombre de Usuario",
            login_password_label: "Contraseña",
            login_submit_btn: "Iniciar Sesión",
            login_cancel_btn: "Cancelar",
            yukari_eye_tooltip: "Brecha de Yukari: Ver/Ocultar Contraseña",
            support_modal_title: "¿Tienes alguna duda o problema? Contáctame aquí",
            support_email_label: "Tu Correo Electrónico",
            support_email_help: "Te responderé a esta casilla directamente.",
            support_title_label: "Título del Asunto",
            support_title_placeholder: "Ej: Duda sobre dominios o sugerencia",
            support_desc_label: "Descripción del Asunto",
            support_desc_placeholder: "Describe aquí tu consulta, duda o inconveniente...",
            support_disclaimer: "Envío seguro y confidencial directo al buzón del desarrollador.",
            support_submit_btn: "Enviar Mensaje",
            support_cancel_btn: "Cancelar",
            toast_lang_changed: "Idioma cambiado a {lang}",
            toast_theme_scarlet: "GensokyoNet • Estilo Scarlet Mist (TH06 Modo Pergamino)",
            toast_theme_haku: "GensokyoNet • Estilo Hakugyokurou (TH07 Modo Oscuro)",
            toast_policy_ask: "Navegación Externa: Preguntar antes de acceder a dominios externos",
            toast_policy_auto: "Navegación Externa: Acceso automático al Mundo Exterior",
            toast_policy_block: "Navegación Externa: Bloqueo total del Mundo Exterior",
            toast_prefs_synced: "Preferencias sincronizadas con tu perfil en la nube."
        },
        en: {
            app_title: "GensokyoNet",
            app_subtitle: "Open Intranet for the Touhou Community",
            nav_new_tab: "New Tab",
            nav_sidebar_toggle: "Toggle Sidebar (Ctrl+B)",
            nav_back: "Back",
            nav_forward: "Forward",
            nav_reload: "Reload",
            nav_home: "Home",
            nav_bookmarks: "Bookmarks",
            nav_add_bookmark: "Add to bookmarks",
            nav_remove_bookmark: "Remove from bookmarks",
            nav_url_placeholder: "Enter a domain or search...",
            nav_go: "Go",
            tab_search: "Search",
            side_hide: "Hide Sidebar",
            side_home: "Home",
            side_claim: "Claim Domain",
            side_builder: "Web Builder",
            side_passport: "Gensokyo Passport",
            side_styles: "Touhou Styles",
            side_support: "Support & Contact",
            sd_search_placeholder: "Search the network...",
            sd_search_btn: "Search",
            sd_claim_title: "CLAIM DOMAIN",
            sd_claim_sub: "Create your own corner",
            sd_history_title: "HISTORY",
            sd_history_sub: "Navigation Log",
            sd_builder_title: "WEB BUILDER",
            sd_builder_sub: "Write your own corner",
            sd_localhost_title: "DEV LOCALHOST",
            sd_localhost_sub: "Test Local Server",
            modal_prefs_title: "GensokyoNet Preferences",
            modal_lang_title: "Language / Idioma",
            lang_es: "🇪🇸 Español",
            lang_es_sub: "Spanish",
            lang_en: "🇬🇧 English",
            lang_en_sub: "Default",
            lang_pt: "🇧🇷 Português",
            lang_pt_sub: "Portuguese",
            modal_theme_title: "Visual Style",
            theme_scarlet: "Scarlet Mist",
            theme_scarlet_sub: "TH06 Parchment Mode",
            theme_haku: "Hakugyokurou",
            theme_haku_sub: "TH07 Dark Mode",
            modal_policy_title: "Outside World Navigation",
            policy_ask: "Ask before accessing external domains",
            policy_auto: "Allow automatic navigation to the Outside World",
            policy_block: "Block access to the external web",
            passport_title: "GENSOKYO PASSPORT • CORE IDENTITY",
            passport_change_avatar: "Change profile picture from your PC",
            passport_unregistered: "Unregistered Account",
            passport_registered: "Authenticated Identity",
            passport_register_btn: "Register",
            passport_login_btn: "Log In",
            passport_logout_btn: "Log Out",
            passport_my_domains: "MY REGISTERED DOMAINS",
            passport_no_domains: "You have no registered domains yet.",
            passport_oauth_title: "OAuth API Token (Gensokyo ID)",
            passport_copy_token: "COPY TOKEN",
            passport_token_copied: "TOKEN COPIED!",
            reg_modal_title: "Register Account • Gensokyo Passport",
            reg_username_label: "Username",
            reg_username_help: "Your primary handle on the GensokyoNet intranet.",
            reg_password_label: "Password",
            reg_password_help: "Must be at least 8 characters long.",
            reg_confirm_password_label: "Confirm Password",
            reg_confirm_password_help: "Enter the exact same password.",
            reg_submit_btn: "Create Account",
            reg_cancel_btn: "Cancel",
            login_modal_title: "Log In • Gensokyo Passport",
            login_username_label: "Username",
            login_password_label: "Password",
            login_submit_btn: "Log In",
            login_cancel_btn: "Cancel",
            yukari_eye_tooltip: "Yukari's Gap: Show/Hide Password",
            support_modal_title: "Questions or issues? Contact me here",
            support_email_label: "Your Email Address",
            support_email_help: "I will reply directly to this address.",
            support_title_label: "Subject Title",
            support_title_placeholder: "Ex: Domain inquiry or suggestion",
            support_desc_label: "Subject Description",
            support_desc_placeholder: "Describe your inquiry, question or issue here...",
            support_disclaimer: "Secure and confidential delivery directly to the developer's inbox.",
            support_submit_btn: "Send Message",
            support_cancel_btn: "Cancel",
            toast_lang_changed: "Language changed to {lang}",
            toast_theme_scarlet: "GensokyoNet • Scarlet Mist Style (TH06 Parchment Mode)",
            toast_theme_haku: "GensokyoNet • Hakugyokurou Style (TH07 Dark Mode)",
            toast_policy_ask: "Outside Navigation: Ask before accessing external domains",
            toast_policy_auto: "Outside Navigation: Automatic access to the Outside World",
            toast_policy_block: "Outside Navigation: Complete block of Outside World",
            toast_prefs_synced: "Preferences synced to your cloud profile."
        },
        pt: {
            app_title: "GensokyoNet",
            app_subtitle: "Intranet Livre para a Comunidade de Touhou",
            nav_new_tab: "Nova Aba",
            nav_sidebar_toggle: "Ocultar / Mostrar barra lateral (Ctrl+B)",
            nav_back: "Voltar",
            nav_forward: "Avançar",
            nav_reload: "Recarregar",
            nav_home: "Início",
            nav_bookmarks: "Favoritos",
            nav_add_bookmark: "Adicionar aos favoritos",
            nav_remove_bookmark: "Remover dos favoritos",
            nav_url_placeholder: "Digite um domínio ou pesquise...",
            nav_go: "Ir",
            tab_search: "Pesquisa",
            side_hide: "Ocultar Barra",
            side_home: "Início",
            side_claim: "Reivindicar Domínio",
            side_builder: "Criador Web",
            side_passport: "Passaporte de Gensokyo",
            side_styles: "Estilos Touhou",
            side_support: "Suporte e Contato",
            sd_search_placeholder: "Pesquisar na rede...",
            sd_search_btn: "Pesquisar",
            sd_claim_title: "REIVINDICAR DOMÍNIO",
            sd_claim_sub: "Crie seu próprio canto",
            sd_history_title: "HISTÓRICO",
            sd_history_sub: "Registro de Navegação",
            sd_builder_title: "CRIADOR WEB",
            sd_builder_sub: "Escreva sua própria página",
            sd_localhost_title: "DEV LOCALHOST",
            sd_localhost_sub: "Testar Servidor Local",
            modal_prefs_title: "Preferências do GensokyoNet",
            modal_lang_title: "Idioma / Language",
            lang_es: "🇪🇸 Español",
            lang_es_sub: "Espanhol",
            lang_en: "🇬🇧 English",
            lang_en_sub: "Inglês",
            lang_pt: "🇧🇷 Português",
            lang_pt_sub: "Padrão",
            modal_theme_title: "Estilo Visual",
            theme_scarlet: "Scarlet Mist",
            theme_scarlet_sub: "TH06 Modo Pergaminho",
            theme_haku: "Hakugyokurou",
            theme_haku_sub: "TH07 Modo Escuro",
            modal_policy_title: "Navegação para o Mundo Exterior",
            policy_ask: "Perguntar antes de acessar domínios externos",
            policy_auto: "Permitir navegação automática para o Mundo Exterior",
            policy_block: "Bloquear acesso à web externa",
            passport_title: "PASSAPORTE DE GENSOKYO • IDENTIDADE CENTRAL",
            passport_change_avatar: "Mudar foto de perfil do seu PC",
            passport_unregistered: "Conta Não Registrada",
            passport_registered: "Identidade Autenticada",
            passport_register_btn: "Registrar-se",
            passport_login_btn: "Entrar",
            passport_logout_btn: "Sair",
            passport_my_domains: "MEUS DOMÍNIOS REGISTRADOS",
            passport_no_domains: "Você ainda não tem domínios registrados.",
            passport_oauth_title: "Token de API OAuth (Gensokyo ID)",
            passport_copy_token: "COPIAR TOKEN",
            passport_token_copied: "TOKEN COPIADO!",
            reg_modal_title: "Registrar Conta • Passaporte de Gensokyo",
            reg_username_label: "Nome de Usuário",
            reg_username_help: "Seu apelido principal na intranet do GensokyoNet.",
            reg_password_label: "Senha",
            reg_password_help: "Deve ter no mínimo 8 caracteres.",
            reg_confirm_password_label: "Confirmar Senha",
            reg_confirm_password_help: "Digite exatamente a mesma senha.",
            reg_submit_btn: "Criar Conta",
            reg_cancel_btn: "Cancelar",
            login_modal_title: "Entrar • Passaporte de Gensokyo",
            login_username_label: "Nome de Usuário",
            login_password_label: "Senha",
            login_submit_btn: "Entrar",
            login_cancel_btn: "Cancelar",
            yukari_eye_tooltip: "Fenda de Yukari: Ver/Ocultar Senha",
            support_modal_title: "Dúvidas ou problemas? Contate-me aqui",
            support_email_label: "Seu E-mail",
            support_email_help: "Responderei diretamente para esta caixa de entrada.",
            support_title_label: "Título do Assunto",
            support_title_placeholder: "Ex: Dúvida sobre domínios ou sugestão",
            support_desc_label: "Descrição do Assunto",
            support_desc_placeholder: "Descreva sua dúvida, pergunta ou problema aqui...",
            support_disclaimer: "Envio seguro e confidencial direto para a caixa do desenvolvedor.",
            support_submit_btn: "Enviar Mensagem",
            support_cancel_btn: "Cancelar",
            toast_lang_changed: "Idioma alterado para {lang}",
            toast_theme_scarlet: "GensokyoNet • Estilo Scarlet Mist (TH06 Modo Pergaminho)",
            toast_theme_haku: "GensokyoNet • Estilo Hakugyokurou (TH07 Modo Escuro)",
            toast_policy_ask: "Navegação Externa: Perguntar antes de acessar domínios externos",
            toast_policy_auto: "Navegação Externa: Acesso automático para o Mundo Exterior",
            toast_policy_block: "Navegação Externa: Bloqueio total do Mundo Exterior",
            toast_prefs_synced: "Preferências sincronizadas com seu perfil na nuvem."
        }
    };

    const languageDisplayNames = {
        es: "Español",
        en: "English",
        pt: "Português"
    };

    window.GensokyoI18n = {
        currentLanguage: "es",
        locales: translations,
        languageNames: languageDisplayNames,

        t(key, params = {}) {
            const lang = this.currentLanguage || "es";
            const dict = this.locales[lang] || this.locales.es;
            let text = dict[key] || (this.locales.es && this.locales.es[key]) || key;
            if (params && typeof params === "object") {
                Object.keys(params).forEach(p => {
                    text = text.replace(new RegExp(`\\{${p}\\}`, "g"), params[p]);
                });
            }
            return text;
        },

        setLanguage(langCode) {
            const safeCode = ["es", "en", "pt"].includes(langCode) ? langCode : "es";
            this.currentLanguage = safeCode;
            try {
                document.documentElement.lang = safeCode;
            } catch (e) {}
            this.applyToDOM();
            return safeCode;
        },

        applyToDOM() {
            document.querySelectorAll("[data-i18n]").forEach(el => {
                const key = el.getAttribute("data-i18n");
                const val = this.t(key);
                if (val) el.textContent = val;
            });

            document.querySelectorAll("[data-i18n-html]").forEach(el => {
                const key = el.getAttribute("data-i18n-html");
                const val = this.t(key);
                if (val) el.innerHTML = val;
            });

            document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
                const key = el.getAttribute("data-i18n-placeholder");
                const val = this.t(key);
                if (val) el.placeholder = val;
            });

            document.querySelectorAll("[data-i18n-title]").forEach(el => {
                const key = el.getAttribute("data-i18n-title");
                const val = this.t(key);
                if (val) el.title = val;
            });

            ["es", "en", "pt"].forEach(code => {
                const card = document.getElementById(`lang-card-${code}`);
                if (card) {
                    card.classList.toggle("active", code === this.currentLanguage);
                }
            });
        }
    };
})();
