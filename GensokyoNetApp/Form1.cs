using System;
using System.IO;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;

namespace GensokyoNetApp
{
    public partial class Form1 : Form
    {
        private WebView2 webView;

        public Form1()
        {
            InitializeComponent();
            SetupFormWindow();
            InitializeWebView();
        }

        private void SetupFormWindow()
        {
            this.Text = "GensokyoNet - Navegador Doujin de Touhou Project";
            this.Width = 1200;
            this.Height = 800;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Icon = System.Drawing.SystemIcons.Application;
        }

        private async void InitializeWebView()
        {
            webView = new WebView2
            {
                Dock = DockStyle.Fill
            };
            this.Controls.Add(webView);

            // Inicializar WebView2 Environment con cache local
            var env = await CoreWebView2Environment.CreateAsync(null, Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GensokyoNetWebViewData"));
            await webView.EnsureCoreWebView2Async(env);

            // Servir los archivos wwwroot locales
            string wwwrootPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot");
            if (!Directory.Exists(wwwrootPath))
            {
                wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            }

            string indexPath = Path.Combine(wwwrootPath, "index.html");

            if (File.Exists(indexPath))
            {
                webView.Source = new Uri(indexPath);
            }
            else
            {
                webView.NavigateToString("<html><body style='background:#0b0914;color:#ffd700;font-family:sans-serif;text-align:center;padding:50px;'><h1>⛩️ GensokyoNet Error</h1><p>No se encontraron los archivos web de wwwroot.</p></body></html>");
            }
        }
    }
}
