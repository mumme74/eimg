import string,cgi,time
from os import curdir, sep, path
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
import urllib, mimetypes

class MyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        print(self.path)
        if (self.path == '/'):
            self.path = 'index.html'
            print ('supposed to be index.html changing to %s' % self.path)
        elif (self.path[0:1] == "/"):
            self.path = self.path[1:]
        if (path.exists(curdir + sep + self.path)):
            file = open(curdir + sep + self.path)
            self.send_response(200)
            url = urllib.pathname2url(self.path)
            mtype, _ = mimetypes.guess_type(url)
            self.send_header('Content-type', mtype)
            self.end_headers()
            self.wfile.write(file.read())
            file.close()
            return
        else:
            print("not found %s" % self.path)
            self.send_error(404, 'File not Found: %s' % self.path)
		 	

def main():
    try:
        server = HTTPServer(('', 8080), MyHandler)
        print 'started httpserver'
        server.serve_forever()
    except KeyboardInterrupt:
        print '^C recived, shutting down server'
        server.socket.close()
        
if __name__ == '__main__':
    main()