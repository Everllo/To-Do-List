    return;
    }

    // Для всех остальных маршрутов — 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Route not found');
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
