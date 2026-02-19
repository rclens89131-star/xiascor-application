'use strict';

/**
 * AUTO-STUB XS_NEWS_ROUTES_HYBRID_V1
 * File: routes/news.cjs
 * Generated: 2026-02-18 22:58:25
 *
 * Compatible with BOTH patterns:
 * 1) const registerNewsRoutes = require("./routes/news.cjs"); registerNewsRoutes(app);
 * 2) app.use("/news", require("./routes/news.cjs"));
 */

const express = require('express');
const router = express.Router();

router.get('/_ping', (req,res) => res.json({ ok:true, route:'news', stub:true }));

function registerOrMiddleware(a,b,c){
  // If called with an Express app-like object
  if(a && typeof a.use === 'function' && typeof a.get === 'function'){
    // mount under /news by default (safe/no-op if already mounted elsewhere)
    a.use('/news', router);
    return router;
  }
  // Otherwise behave like a normal router middleware
  return router(a,b,c);
}

module.exports = registerOrMiddleware;