cd $(dirname $([ -L $0 ] && readlink -f $0 || echo $0))
forever start server.js