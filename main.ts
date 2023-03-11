// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.167.0/http/server.ts";
import { Hono } from "https://deno.land/x/hono@v3.0.2/mod.ts";
import { compress, cors, serveStatic } from "https://deno.land/x/hono@v3.0.2/middleware.ts";

import redaxios from "https://deno.land/x/redaxios@0.5.1/mod.ts";
import { parse } from "https://deno.land/x/xml@2.1.0/mod.ts";

/*
||  ==================================================
||  Types
||  ==================================================
*/

type Weather = any;

/*
||  ==================================================
||  Utilities
||  ==================================================
*/

// const isTypeofString = (value: unknown): value is string => typeof value === "string";
// const isTypeofNumber = (value: unknown): value is number => typeof value === "number";
// const isTypeofObject = (value: unknown): value is Record<string, unknown> => typeof value === "object";
// const isNotNull = (value: unknown): value is any => value != null;
// const isObject = (value: unknown): value is Record<PropertyKey, any> => isTypeofObject(value) && isNotNull(value);
// const isArray = (value: unknown): value is any[] => Array.isArray(value);

class MapX<K, V> extends Map<K, V> {
  private maxSize: number;

  constructor(maxSize: number) {
    super();
    this.maxSize = maxSize;
  }

  private get head(): K {
    return this.keys().next().value;
  }
  public peek(key: K): V | undefined {
    return super.get(key);
  }
  public get(key: K): V | undefined {
    const item = this.peek(key);
    if (item !== undefined) {
      super.delete(key);
      super.set(key, item);
    }
    return item;
  }
  public set(key: K, value: V): this {
    super.delete(key);
    if (this.size === this.maxSize) super.delete(this.head);

    super.set(key, value);
    return this;
  }
}

/*
||  ==================================================
||  Variables
||  ==================================================
*/

const WeatherMap = new MapX<string, Weather>(99);

const api = {
  JawaTimur: "https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/DigitalForecast-JawaTimur.xml",
};

/*
||  ==================================================
||  App
||  ==================================================
*/

const getKey = () => {
  const local = new Date();
  return `${local.getDate()}-${local.getMonth()}-${local.getFullYear()}`;
};

const app = new Hono();

app.use("*", compress());
app.use("*", cors());
app.use("/favicon.ico", serveStatic({ path: "./favicon.ico" }));
app.get("/latest/:id", async (c) => {
  const id = c.req.param("id");

  if (id in api) {
    const key = getKey();
    let cached: Weather | undefined = WeatherMap.get(key);
    if (typeof cached !== "undefined") return c.json(cached);
    cached = parse(String((await redaxios(api[id as keyof typeof api])).data));
    if (typeof cached !== "undefined") WeatherMap.set(key, cached);
    return c.json(cached);
  }

  return c.json({ not: "found" });
});
app.get("/", (c) => c.json({ name: "bmkg-apideno" }));
app.get("*", (c) => c.json({ 404: "not-found" }));

serve(app.fetch);
