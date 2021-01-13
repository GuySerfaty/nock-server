import express, { Router } from 'express';
import { Method, AddRouteBody } from "./types"

let mockHandlers: any = {};

const getRouteKey = (method: Method, path: string) => `[${method}]${path}`

const extractRouteKey = (route: string) => {
  const splittedRoute = route.split("]")
  const path = splittedRoute[1];
  const method = splittedRoute[0].split("[")[1]
  return ({ path, method })
}


const removeMiddlewares = (route: any, i: number, routes: any, method: Method, path: string) => {
  const existingMock = mockHandlers[getRouteKey(method, path)];
  if (existingMock && existingMock.middleware === route.handle) {
    routes.splice(i, 1);
  }
  if (route.route)
    route.route.stack.forEach((route: any, i: number, routes: any) => removeMiddlewares(route, i, routes, method, path));
}

const app = express();

app.use(express.json());
app.get('/', (req, res) => res.send('hello'));

const adminPath = '/_routes'
app.get(adminPath, (req, res) => {
  const { method: queryMethod, path: queryPath } = req.query;
  if (queryMethod && queryPath) {
    const routeKey = getRouteKey(queryMethod as Method, queryPath as string);
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
  }: AddRouteBody = req.body
  if (!method || !path || !response) {
    return res.status(500).send('Should provide : !method || ! path || !response')
  }

  const newRouteKey = getRouteKey(method, path);

  mockHandlers[newRouteKey] = {
    count: 0,
    method,
    path,
    response,
    stubRequests: [],
    middleware: (req: any, res: any) => {
      mockHandlers[newRouteKey].count += 1;
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
  routes.forEach((route: any, i: number, routes: any) => removeMiddlewares(route, i, routes, method, path));
  return res.send('canceled')
});


app.delete(adminPath + "/all", (req, res) => {
  try {
    for (const handler in mockHandlers) {
      const { method, path } = extractRouteKey(handler)
      const routes = app._router.stack;
      //@ts-ignore
      routes.forEach((route: any, i: number, routes: any) => removeMiddlewares(route, i, routes, method, path));
    }
    return res.json({ success: true })
  } catch (e) {

    res.status(400).json({ error: e.message })
  }
})

export default app;