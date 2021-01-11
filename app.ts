import express, { Router } from 'express';

interface AddRouteBody {
  method: 'all' | 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';
  path: string;
  response: {
    body: any;
    status: number;
  };
}

let mockHandlers: any = {};

const getRouteKey = (method: AddRouteBody["method"], path: string) => `[${method}]${path}`

const app = express();

app.use(express.json());
app.get('/', (req, res) => res.send('hello'));

const adminPath = '/_routes'
app.get(adminPath, (req, res) => {
  const { method: queryMethod, path: queryPath } = req.query;
  if (queryMethod && queryPath) {
    const routeKey = getRouteKey(queryMethod as AddRouteBody["method"], queryPath as string);
    if (!mockHandlers[routeKey]) {
      console.log('mock not found');
      return res.status(500).send({ error: 'mock not found' });
    }
    const { count, method, path, stubRequests, response } = mockHandlers[routeKey];
    return res.send({
      count, method, path, stubRequests, response
    });
  }
  return res.send(Object.keys(mockHandlers).map(routeKey => {
    const { count, method, path, stubRequests } = mockHandlers[routeKey];
    return {
      count, method, path, stubRequests
    }
  }))
});

app.post(adminPath, (req, res) => {
  console.log('this is the body', req.body)
  const {
    method,
    path,
    response,
  } : AddRouteBody = req.body
  if (!method || ! path || !response) {
    return res.status(500).send('Should provide : !method || ! path || !response')
  }

  const newRouteKey = getRouteKey(method, path);

  mockHandlers[newRouteKey] = {
    count: 0,
    method,
    path,
    response,
    stubRequests: [],
    middleware: (req:any, res:any) => {
      mockHandlers[newRouteKey].count += 1;
      // console.log('reqreq', req)
      mockHandlers[newRouteKey].stubRequests.push({ params: req.params, query: req.query, body: req.body, headers: req.headers });
      return res.status(response.status || 200).send(response.body)
    }
  }
  app[method](path, mockHandlers[newRouteKey].middleware);
  return res.send('added')
});
app.delete(adminPath, (req, res) => {
  const { path, method } = req.body
  const routes = app._router.stack;
  routes.forEach(removeMiddlewares);
  function removeMiddlewares(route: any, i: number, routes: any) {
    const existingMock = mockHandlers[getRouteKey(method, path)];
      if (existingMock && existingMock.middleware === route.handle) {
        routes.splice(i, 1);
      }
      if (route.route)
          route.route.stack.forEach(removeMiddlewares);
  }
  return res.send('canceled')
});

export default app;