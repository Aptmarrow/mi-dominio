using System;
using System.Drawing;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;

namespace GensokyoNetApp
{
    public partial class Form1 : Form
    {
        private sealed class NativeModalResult
        {
            public bool Ok { get; set; }
            public string Message { get; set; } = "";
        }

        private WebView2? shellWebView;     // Shell principal de GensokyoNet (Header, Sidebar, Intranet UI)
        private WebView2? contentWebView;   // Visor Flotante Sincronizado sobre #th-viewport para el Mundo Exterior

        public Form1()
        {
            InitializeComponent();
            SetupFormLayout();
            InitializeWebViews();
        }

        private void SetupFormLayout()
        {
            this.Text = "GensokyoNet Browser - Red Doujin de Touhou Project";
            this.Width = 1280;
            this.Height = 850;
            this.StartPosition = FormStartPosition.CenterScreen;
        }

        private static bool IsTrustedShellUri(string? rawUri)
        {
            if (!Uri.TryCreate(rawUri, UriKind.Absolute, out var uri)) return false;
            return uri.Scheme == Uri.UriSchemeHttps &&
                   string.Equals(uri.Host, "gensokyonet.local", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsAllowedExternalUri(string? rawUri, out Uri? parsedUri)
        {
            parsedUri = null;
            if (!Uri.TryCreate(rawUri, UriKind.Absolute, out var candidate)) return false;
            if (candidate.Scheme != Uri.UriSchemeHttp && candidate.Scheme != Uri.UriSchemeHttps) return false;
            if (string.Equals(candidate.Host, "gensokyonet.local", StringComparison.OrdinalIgnoreCase)) return false;
            parsedUri = candidate;
            return true;
        }

        private async void InitializeWebViews()
        {
            try
            {
                var dataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GensokyoNetWebViewData");
                var env = await CoreWebView2Environment.CreateAsync(null, dataPath);

                // 1. Content WebView2 (Mundo Exterior aislado)
                contentWebView = new WebView2
                {
                    Visible = false,
                    Bounds = new Rectangle(0, 0, 800, 600)
                };
                this.Controls.Add(contentWebView);
                await contentWebView.EnsureCoreWebView2Async(env);

                // Hardening del visor externo: sin acceso a WebMessage ni objetos COM nativos
                contentWebView.CoreWebView2.Settings.IsWebMessageEnabled = false;
                contentWebView.CoreWebView2.Settings.AreHostObjectsAllowed = false;
                contentWebView.CoreWebView2.Settings.IsStatusBarEnabled = false;

                contentWebView.CoreWebView2.NavigationStarting += (s, args) =>
                {
                    if (!IsAllowedExternalUri(args.Uri, out _))
                    {
                        args.Cancel = true;
                    }
                };

                contentWebView.CoreWebView2.NewWindowRequested += (s, args) =>
                {
                    args.Handled = true;
                    if (IsAllowedExternalUri(args.Uri, out var targetUri) && targetUri != null)
                    {
                        contentWebView.CoreWebView2.Navigate(targetUri.ToString());
                    }
                };

                // 2. Shell WebView2 (Intranet UI privilegiada)
                shellWebView = new WebView2 { Dock = DockStyle.Fill };
                this.Controls.Add(shellWebView);
                await shellWebView.EnsureCoreWebView2Async(env);

                shellWebView.CoreWebView2.Settings.AreHostObjectsAllowed = false;
                shellWebView.CoreWebView2.Settings.IsWebMessageEnabled = true;
                shellWebView.CoreWebView2.Settings.IsStatusBarEnabled = false;

                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string[] candidateRoots = new[]
                {
                    Path.Combine(baseDir, "wwwroot"),
                    Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"),
                    Path.GetFullPath(Path.Combine(baseDir, @"..\..\..\wwwroot")),
                    Path.GetFullPath(Path.Combine(baseDir, @"..\..\..\..\GensokyoNetApp\wwwroot")),
                    Path.GetFullPath(Path.Combine(baseDir, @"..\..\..\..")),
                    Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), @".."))
                };

                string wwwrootPath = Path.Combine(baseDir, "wwwroot");
                foreach (var candidate in candidateRoots)
                {
                    if (Directory.Exists(candidate) &&
                        File.Exists(Path.Combine(candidate, "index.html")) &&
                        Directory.Exists(Path.Combine(candidate, "styles")))
                    {
                        wwwrootPath = candidate;
                        break;
                    }
                }

                shellWebView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "gensokyonet.local", wwwrootPath, CoreWebView2HostResourceAccessKind.DenyCors);

                // Validación estricta de Host (evita bypass gensokyonet.local.attacker.com)
                shellWebView.CoreWebView2.NavigationStarting += (s, args) =>
                {
                    if (!IsTrustedShellUri(args.Uri))
                    {
                        System.Diagnostics.Debug.WriteLine($"[DEFENSA EN PROFUNDIDAD] Bloqueada navegación fuera de gensokyonet.local: {args.Uri}");
                        args.Cancel = true;
                    }
                };

                shellWebView.CoreWebView2.NewWindowRequested += (s, args) =>
                {
                    args.Handled = true;
                };

                shellWebView.Source = new Uri("https://gensokyonet.local/index.html");

                shellWebView.CoreWebView2.WebMessageReceived += OnShellWebMessageReceived;
                contentWebView.CoreWebView2.SourceChanged += OnContentSourceChanged;
                contentWebView.CoreWebView2.DocumentTitleChanged += OnContentTitleChanged;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al inicializar GensokyoNet WebView2: {ex.Message}", "Error de Inicialización", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void OnShellWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                // Verificar que el mensaje provenga exclusivamente del origen del Shell
                if (!IsTrustedShellUri(e.Source)) return;

                string jsonMessage = e.WebMessageAsJson;
                if (string.IsNullOrWhiteSpace(jsonMessage)) return;

                using var doc = JsonDocument.Parse(jsonMessage);
                var root = doc.RootElement;

                if (!root.TryGetProperty("action", out var actionProp)) return;
                string? action = actionProp.GetString();
                if (string.IsNullOrWhiteSpace(action)) return;

                switch (action)
                {
                    case "viewportRectChanged":
                        if (root.TryGetProperty("rect", out var rectProp))
                        {
                            int x = Math.Max(0, (int)Math.Round(rectProp.GetProperty("x").GetDouble()));
                            int y = Math.Max(0, (int)Math.Round(rectProp.GetProperty("y").GetDouble()));
                            int width = Math.Max(1, (int)Math.Round(rectProp.GetProperty("width").GetDouble()));
                            int height = Math.Max(1, (int)Math.Round(rectProp.GetProperty("height").GetDouble()));

                            if (contentWebView != null)
                            {
                                contentWebView.Bounds = new Rectangle(x, y, width, height);
                            }
                        }
                        break;

                    case "crossHakureiBarrier":
                        if (!root.TryGetProperty("url", out var urlProp)) return;
                        if (!IsAllowedExternalUri(urlProp.GetString(), out var parsedUri) || parsedUri == null) return;

                        if (contentWebView?.CoreWebView2 != null)
                        {
                            contentWebView.Visible = true;
                            contentWebView.BringToFront();
                            contentWebView.CoreWebView2.Navigate(parsedUri.ToString());
                        }
                        break;

                    case "returnToIntranet":
                    case "suspendExternalViewport":
                        // También oculta contentWebView cuando se abren modales HTML del Shell para evitar solapamiento Z-order
                        if (contentWebView != null)
                        {
                            contentWebView.Visible = false;
                        }
                        break;

                    case "openModal":
                        if (!root.TryGetProperty("modalType", out var modalTypeProp)) return;
                        if (contentWebView != null) contentWebView.Visible = false;
                        OpenNativeModalDialog(modalTypeProp.GetString() ?? "modal");
                        break;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error en WebMessage: {ex.Message}");
            }
        }

        private async void OnContentSourceChanged(object? sender, CoreWebView2SourceChangedEventArgs e)
        {
            try
            {
                if (contentWebView?.CoreWebView2 == null || shellWebView?.CoreWebView2 == null) return;

                string currentUrl = contentWebView.Source?.ToString() ?? "";
                string safeJsonUrl = JsonSerializer.Serialize(currentUrl);
                string script = $"if(window.GensokyoApp && window.GensokyoApp.updateExternalUrlFromNative) {{ GensokyoApp.updateExternalUrlFromNative({safeJsonUrl}); }}";
                await shellWebView.CoreWebView2.ExecuteScriptAsync(script);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error al sincronizar URL: {ex.Message}");
            }
        }

        private async void OnContentTitleChanged(object? sender, object? e)
        {
            try
            {
                if (contentWebView?.CoreWebView2 == null || shellWebView?.CoreWebView2 == null) return;

                string title = contentWebView.CoreWebView2.DocumentTitle ?? "";
                string safeJsonTitle = JsonSerializer.Serialize(title);
                string script = $"if(window.GensokyoApp && window.GensokyoApp.updateExternalTitleFromNative) {{ GensokyoApp.updateExternalTitleFromNative({safeJsonTitle}); }}";
                await shellWebView.CoreWebView2.ExecuteScriptAsync(script);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error al sincronizar título: {ex.Message}");
            }
        }

        private void OpenNativeModalDialog(string modalType)
        {
            switch ((modalType ?? "").Trim().ToLowerInvariant())
            {
                case "register":
                    OpenRegisterNativeModal();
                    break;
                case "login":
                    OpenLoginNativeModal();
                    break;
                default:
                    MessageBox.Show("Este modal nativo aún no está implementado.", "GensokyoNet", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    break;
            }
        }

        private async Task<NativeModalResult> InvokePassportActionAsync(string actionMethod, object payload)
        {
            if (shellWebView?.CoreWebView2 == null)
            {
                return new NativeModalResult { Ok = false, Message = "Shell no disponible." };
            }

            string payloadJson = JsonSerializer.Serialize(payload);
            string script = $@"
                (async () => {{
                    if (!window.GensokyoApp || typeof window.GensokyoApp.{actionMethod} !== 'function') {{
                        return JSON.stringify({{ ok: false, message: 'Acción JS no disponible.' }});
                    }}
                    try {{
                        const result = await window.GensokyoApp.{actionMethod}({payloadJson});
                        return JSON.stringify(result || {{ ok: false, message: 'Sin respuesta de la acción.' }});
                    }} catch (err) {{
                        return JSON.stringify({{ ok: false, message: (err && err.message) ? err.message : 'Error desconocido.' }});
                    }}
                }})();";

            string raw = await shellWebView.CoreWebView2.ExecuteScriptAsync(script);
            string? resultJson = JsonSerializer.Deserialize<string>(raw);
            if (string.IsNullOrWhiteSpace(resultJson))
            {
                return new NativeModalResult { Ok = false, Message = "Respuesta JS vacía." };
            }

            NativeModalResult? result = JsonSerializer.Deserialize<NativeModalResult>(resultJson);
            return result ?? new NativeModalResult { Ok = false, Message = "No se pudo interpretar la respuesta del modal." };
        }

        private void OpenRegisterNativeModal()
        {
            Form modalForm = new Form
            {
                Text = "GensokyoNet - Registro de Cuenta",
                Width = 520,
                Height = 360,
                StartPosition = FormStartPosition.CenterParent,
                FormBorderStyle = FormBorderStyle.FixedDialog,
                MaximizeBox = false,
                MinimizeBox = false,
                Owner = this
            };

            Label titleLabel = new Label
            {
                Text = "Crear cuenta de Pasaporte",
                Left = 20,
                Top = 16,
                Width = 460,
                Font = new Font("Segoe UI", 12, FontStyle.Bold)
            };

            Label userLabel = new Label { Text = "Usuario", Left = 20, Top = 56, Width = 120 };
            TextBox userInput = new TextBox { Left = 20, Top = 76, Width = 460 };

            Label passLabel = new Label { Text = "Contraseña", Left = 20, Top = 110, Width = 120 };
            TextBox passInput = new TextBox { Left = 20, Top = 130, Width = 460, UseSystemPasswordChar = true };

            Label confirmLabel = new Label { Text = "Repetir contraseña", Left = 20, Top = 164, Width = 160 };
            TextBox confirmInput = new TextBox { Left = 20, Top = 184, Width = 460, UseSystemPasswordChar = true };

            Label feedbackLabel = new Label
            {
                Left = 20,
                Top = 220,
                Width = 460,
                Height = 40,
                ForeColor = Color.FromArgb(160, 0, 0)
            };

            Button cancelButton = new Button
            {
                Text = "Cancelar",
                Left = 280,
                Top = 270,
                Width = 95,
                DialogResult = DialogResult.Cancel
            };

            Button submitButton = new Button
            {
                Text = "Crear Cuenta",
                Left = 385,
                Top = 270,
                Width = 95
            };

            submitButton.Click += async (_, __) =>
            {
                submitButton.Enabled = false;
                feedbackLabel.Text = "Validando...";

                NativeModalResult result = await InvokePassportActionAsync("submitRegisterFromNative", new
                {
                    username = userInput.Text,
                    password = passInput.Text,
                    confirmPassword = confirmInput.Text
                });

                if (result.Ok)
                {
                    modalForm.DialogResult = DialogResult.OK;
                    modalForm.Close();
                    return;
                }

                feedbackLabel.Text = result.Message;
                submitButton.Enabled = true;
            };

            modalForm.AcceptButton = submitButton;
            modalForm.CancelButton = cancelButton;
            modalForm.Controls.AddRange(new Control[]
            {
                titleLabel, userLabel, userInput, passLabel, passInput,
                confirmLabel, confirmInput, feedbackLabel, cancelButton, submitButton
            });

            modalForm.FormClosed += async (s, e) =>
            {
                try
                {
                    if (shellWebView?.CoreWebView2 != null)
                    {
                        await shellWebView.CoreWebView2.ExecuteScriptAsync("if(window.GensokyoApp){GensokyoApp.loadPassportData();GensokyoApp.loadHakureiPolicy();}");
                    }
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"Error al refrescar estado tras cerrar modal nativo: {ex.Message}");
                }
            };

            modalForm.ShowDialog(this);
        }

        private void OpenLoginNativeModal()
        {
            Form modalForm = new Form
            {
                Text = "GensokyoNet - Iniciar Sesión",
                Width = 520,
                Height = 320,
                StartPosition = FormStartPosition.CenterParent,
                FormBorderStyle = FormBorderStyle.FixedDialog,
                MaximizeBox = false,
                MinimizeBox = false,
                Owner = this
            };

            Label titleLabel = new Label
            {
                Text = "Ingreso con Pasaporte",
                Left = 20,
                Top = 16,
                Width = 460,
                Font = new Font("Segoe UI", 12, FontStyle.Bold)
            };

            Label userLabel = new Label { Text = "Usuario", Left = 20, Top = 56, Width = 120 };
            TextBox userInput = new TextBox { Left = 20, Top = 76, Width = 460 };

            Label passLabel = new Label { Text = "Contraseña", Left = 20, Top = 110, Width = 120 };
            TextBox passInput = new TextBox { Left = 20, Top = 130, Width = 460, UseSystemPasswordChar = true };

            Label feedbackLabel = new Label
            {
                Left = 20,
                Top = 166,
                Width = 460,
                Height = 40,
                ForeColor = Color.FromArgb(160, 0, 0)
            };

            Button cancelButton = new Button
            {
                Text = "Cancelar",
                Left = 280,
                Top = 226,
                Width = 95,
                DialogResult = DialogResult.Cancel
            };

            Button submitButton = new Button
            {
                Text = "Entrar",
                Left = 385,
                Top = 226,
                Width = 95
            };

            submitButton.Click += async (_, __) =>
            {
                submitButton.Enabled = false;
                feedbackLabel.Text = "Validando...";

                NativeModalResult result = await InvokePassportActionAsync("submitLoginFromNative", new
                {
                    username = userInput.Text,
                    password = passInput.Text
                });

                if (result.Ok)
                {
                    modalForm.DialogResult = DialogResult.OK;
                    modalForm.Close();
                    return;
                }

                feedbackLabel.Text = result.Message;
                submitButton.Enabled = true;
            };

            modalForm.AcceptButton = submitButton;
            modalForm.CancelButton = cancelButton;
            modalForm.Controls.AddRange(new Control[]
            {
                titleLabel, userLabel, userInput, passLabel, passInput,
                feedbackLabel, cancelButton, submitButton
            });

            modalForm.FormClosed += async (s, e) =>
            {
                try
                {
                    if (shellWebView?.CoreWebView2 != null)
                    {
                        await shellWebView.CoreWebView2.ExecuteScriptAsync("if(window.GensokyoApp){GensokyoApp.loadPassportData();GensokyoApp.loadHakureiPolicy();}");
                    }
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"Error al refrescar estado tras cerrar modal nativo: {ex.Message}");
                }
            };

            modalForm.ShowDialog(this);
        }
    }
}
