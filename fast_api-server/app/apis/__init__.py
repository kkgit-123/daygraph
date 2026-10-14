from app.apis import ask, auth, day, decisions, dev, google_auth, graph, hooks, me, misc, plan, tasks, team

ROUTERS = [auth.router, google_auth.router, hooks.router, team.router, me.router, tasks.router, day.router, plan.router, decisions.router, graph.router, ask.router, misc.router, dev.router]
