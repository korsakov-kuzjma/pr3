package main

import (
	"bufio"
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
)

var (
	server     *http.Server
	serverLock sync.Mutex
)

func startServer(port string) {
	serverLock.Lock()
	defer serverLock.Unlock()

	if server != nil {
		fmt.Println("Сервер уже запущен")
		return
	}

	// Создаем кастомный файловый сервер с обработкой 404
	fileServer := http.FileServer(http.Dir("static"))

	mux := http.NewServeMux()

	// Обработчик для всех путей
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Проверяем существование файла
		path := filepath.Join("static", r.URL.Path)

		// Если запрашивается корень - проверяем index.html
		if r.URL.Path == "/" {
			path = filepath.Join("static", "index.html")
		}

		// Проверяем существование файла
		if _, err := os.Stat(path); os.IsNotExist(err) {
			// Файл не найден - показываем кастомную 404 страницу
			custom404Path := filepath.Join("static", "404.html")
			if _, err := os.Stat(custom404Path); err == nil {
				// Если есть кастомная 404 страница - отдаем ее
				w.WriteHeader(http.StatusNotFound)
				http.ServeFile(w, r, custom404Path)
				return
			}

			// Если нет кастомной 404 - показываем стандартную
			w.WriteHeader(http.StatusNotFound)
			fmt.Fprintf(w, `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>404 Not Found</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            text-align: center; 
                            padding: 50px; 
                            background-color: #f5f5f5;
                        }
                        .error-container {
                            background: white;
                            padding: 40px;
                            border-radius: 10px;
                            box-shadow: 0 0 10px rgba(0,0,0,0.1);
                            display: inline-block;
                        }
                        h1 { color: #e74c3c; }
                        a { 
                            color: #3498db; 
                            text-decoration: none;
                        }
                        a:hover { text-decoration: underline; }
                    </style>
                </head>
                <body>
                    <div class="error-container">
                        <h1>404</h1>
                        <h2>Страница не найдена</h2>
                        <p>Запрошенный URL %s не существует на этом сервере.</p>
                        <p><a href="/">Вернуться на главную</a></p>
                    </div>
                </body>
                </html>
            `, r.URL.Path)
			return
		}

		// Если файл существует - обслуживаем его
		http.StripPrefix("/", fileServer).ServeHTTP(w, r)
	}))

	server = &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	fmt.Printf("Запуск сервера на порту %s...\n", port)
	fmt.Println("Обслуживание статических файлов из директории 'static'")

	// Создаем директорию static, если ее нет
	if _, err := os.Stat("static"); os.IsNotExist(err) {
		os.Mkdir("static", 0755)
		fmt.Println("Создана директория 'static'")

		// Создаем базовый index.html и 404.html
		createDefaultFiles()
	}

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Printf("Ошибка сервера: %v\n", err)
			serverLock.Lock()
			server = nil
			serverLock.Unlock()
		}
	}()
}

func createDefaultFiles() {
	// Создаем стандартный index.html
	indexContent := `<!DOCTYPE html>
<html>
<head>
    <title>Главная страница</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        h1 { color: #3498db; }
    </style>
</head>
<body>
    <h1>Добро пожаловать на мой сервер!</h1>
    <p>Это стандартная страница. Замените ее своим контентом.</p>
</body>
</html>`

	os.WriteFile("static/index.html", []byte(indexContent), 0644)

	// Создаем кастомную страницу 404
	errorContent := `<!DOCTYPE html>
<html>
<head>
    <title>404 Not Found</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background-color: #f5f5f5;
        }
        .error-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            display: inline-block;
        }
        h1 { color: #e74c3c; }
        a { 
            color: #3498db; 
            text-decoration: none;
        }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>404</h1>
        <h2>Страница не найдена</h2>
        <p>Извините, но страница, которую вы ищете, не существует.</p>
        <p><a href="/">Вернуться на главную</a></p>
    </div>
</body>
</html>`

	os.WriteFile("static/404.html", []byte(errorContent), 0644)
}

func stopServer() {
	serverLock.Lock()
	defer serverLock.Unlock()

	if server == nil {
		fmt.Println("Сервер не запущен")
		return
	}

	fmt.Println("Остановка сервера...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		fmt.Printf("Ошибка при остановке: %v\n", err)
	}

	server = nil
	fmt.Println("Сервер остановлен")
}

func serverStatus() string {
	serverLock.Lock()
	defer serverLock.Unlock()

	if server != nil {
		return "Сервер работает"
	}
	return "Сервер остановлен"
}

func main() {
	// Обработка Ctrl+C
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigChan
		fmt.Println("\nЗавершение работы...")
		stopServer()
		os.Exit(0)
	}()

	fmt.Println("Консоль управления сервером")
	fmt.Println("Введите 'помощь' для списка команд")

	reader := bufio.NewReader(os.Stdin)

	for {
		fmt.Print("> ")
		input, err := reader.ReadString('\n')
		if err != nil {
			fmt.Println("Ошибка чтения:", err)
			continue
		}

		input = strings.TrimSpace(input)
		parts := strings.Fields(input)
		if len(parts) == 0 {
			continue
		}

		cmd := parts[0]
		args := parts[1:]

		switch cmd {
		case "запустить":
			port := "8080"
			if len(args) > 0 {
				port = args[0]
			}
			startServer(port)
		case "остановить":
			stopServer()
		case "перезагрузить":
			port := "8080"
			if len(args) > 0 {
				port = args[0]
			}
			stopServer()
			time.Sleep(100 * time.Millisecond)
			startServer(port)
		case "статус":
			fmt.Println(serverStatus())
		case "выход":
			stopServer()
			fmt.Println("Выход")
			return
		case "помощь":
			fmt.Println(`Доступные команды:
  запустить [порт] - запуск сервера (по умолчанию 8080)
  остановить       - остановка сервера
  перезагрузить    - перезапуск сервера
  статус          - статус сервера
  выход           - выход
  помощь          - справка`)
		default:
			fmt.Println("Неизвестная команда. Введите 'помощь'")
		}
	}
}
