using System;
using System.Drawing;
using System.IO;
using System.Text.Json;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;

namespace GensokyoNetApp
{
    public partial class Form1 : Form
    {
        private WebView2 shellWebView;     // Shell principal de GensokyoNet (Header, Sidebar, Intranet UI)
        private WebView2 contentWebView;   // Visor Flotante Sincronizado sobre #th-viewport para el Mundo Exterior

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

        private async void InitializeWebViews()
        {
            try
            {
                var dataPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GensokyoNetWebViewData");
                var env = await CoreWebView2Environment.CreateAsync(null, dataPath);

                // 1. Inicializar Content WebView2 (Visor Flotante de Navegación Externa) - Arranca Oculto
                contentWebView = new WebView2
                {
                    Visible = false,
                    Bounds = new Rectangle(0, 0, 800, 600)
                };
                this.Controls.Add(contentWebView);
                await contentWebView.EnsureCoreWebView2Async(env);

                // 2. Inicializar Shell WebView2 (UI Completa de GensokyoNet) - Dock Fill
                shellWebView = new WebView2 { Dock = DockStyle.Fill };
                this.Controls.Add(shellWebView);
                await shellWebView.EnsureCoreWebView2Async(env);

                // Mapeo de Host Virtual Seguro (https://gensokyonet.local)
                string wwwrootPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot");
                if (!Directory.Exists(wwwrootPath))
                {
                    wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                }

                shellWebView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                    "gensokyonet.local", wwwrootPath, CoreWebView2HostResourceAccessKind.Allow);

                // 🔒 Defensa en Profundidad: Bloquear cualquier navegación del Shell fuera del host virtual
                shellWebView.CoreWebView2.NavigationStarting += (s, args) =>
                {
                    if (!args.Uri.StartsWith("https://gensokyonet.local", StringComparison.OrdinalIgnoreCase))
                    {
                        System.Diagnostics.Debug.WriteLine($"[DEFENSA EN PROFUNDIDAD] Bloqueada navegación fuera de gensokyonet.local: {args.Uri}");
                        args.Cancel = true;
                    }
                };

                // Bloquear ventanas independientes sueltas del Shell
                shellWebView.CoreWebView2.NewWindowRequested += (s, args) =>
                {
                    args.Handled = true;
                };

                // Navegar el Shell al Host Virtual Seguro
                shellWebView.Source = new Uri("https://gensokyonet.local/index.html");

                // Suscribir los eventos del Puente WebMessage (JS ↔ C#)
                shellWebView.CoreWebView2.WebMessageReceived += OnShellWebMessageReceived;
                contentWebView.CoreWebView2.SourceChanged += OnContentSourceChanged;
                contentWebView.CoreWebView2.DocumentTitleChanged += OnContentTitleChanged;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error al inicializar GensokyoNet WebView2: {ex.Message}", "Error de Inicialización", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void OnShellWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                string jsonMessage = e.TryGetWebMessageAsString();
                if (string.IsNullOrWhiteSpace(jsonMessage)) return;

                using var doc = JsonDocument.Parse(jsonMessage);
                var root = doc.RootElement;

                if (!root.TryGetProperty("action", out var actionProp)) return;
                string action = actionProp.GetString();

                switch (action)
                {
                    case "viewportRectChanged":
                        // Ajusta dinámicamente las coordenadas del contentWebView al rectángulo de #th-viewport
                        if (root.TryGetProperty("rect", out var rectProp))
                        {
                            int x = (int)Math.Round(rectProp.GetProperty("x").GetDouble());
                            int y = (int)Math.Round(rectProp.GetProperty("y").GetDouble());
                            int width = (int)Math.Round(rectProp.GetProperty("width").GetDouble());
                            int height = (int)Math.Round(rectProp.GetProperty("height").GetDouble());

                            contentWebView.Bounds = new Rectangle(x, y, width, height);
                        }
                        break;

                    case "crossHakureiBarrier":
                        if (!root.TryGetProperty("url", out var urlProp)) return;
                        string targetUrl = urlProp.GetString();

                        if (!Uri.TryCreate(targetUrl, UriKind.Absolute, out var parsedUri) ||
                            (parsedUri.Scheme != Uri.UriSchemeHttp && parsedUri.Scheme != Uri.UriSchemeHttps))
                        {
                            return;
                        }

                        // Muestra el contentWebView sobre el área de #th-viewport y navega top-level
                        contentWebView.Visible = true;
                        contentWebView.BringToFront();
                        contentWebView.CoreWebView2.Navigate(parsedUri.ToString());
                        break;

                    case "returnToIntranet":
                        // Oculta el contentWebView al volver a la intranet de GensokyoNet
                        contentWebView.Visible = false;
                        break;

                    case "openModal":
                        if (!root.TryGetProperty("modalType", out var modalTypeProp)) return;
                        OpenNativeModalDialog(modalTypeProp.GetString());
                        break;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error en WebMessage: {ex.Message}");
            }
        }

        private async void OnContentSourceChanged(object sender, CoreWebView2SourceChangedEventArgs e)
        {
            try
            {
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

        private async void OnContentTitleChanged(object sender, EventArgs e)
        {
            try
            {
                string title = contentWebView.CoreWebView2?.DocumentTitle ?? "";
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
            Form modalForm = new Form
            {
                Text = $"GensokyoNet - {modalType.ToUpper()}",
                Width = 480,
                Height = 360,
                StartPosition = FormStartPosition.CenterParent,
                FormBorderStyle = FormBorderStyle.FixedDialog,
                MaximizeBox = false,
                MinimizeBox = false,
                Owner = this
            };

            modalForm.FormClosed += async (s, e) =>
            {
                try
                {
                    await shellWebView.CoreWebView2.ExecuteScriptAsync("if(window.GensokyoApp) { GensokyoApp.loadPassportData(); GensokyoApp.loadHakureiPolicy(); }");
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"Error al cerrar modal: {ex.Message}");
                }
            };

            modalForm.ShowDialog(this);
        }
    }
}
