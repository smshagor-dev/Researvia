import { describe, expect, it } from "vitest";
import { parseCsv } from "@/server/imports/import.service";

describe("academic import CSV parser", () => {
  it("parses quoted commas, escaped quotes, CRLF and missing cells", () => {
    const rows = parseCsv('name,country,description,city\r\n"Example University",US,"Research, science",Boston\r\n"Quoted ""Institute""",UK,,London\r\n');
    expect(rows).toEqual([
      { name: "Example University", country: "US", description: "Research, science", city: "Boston" },
      { name: 'Quoted "Institute"', country: "UK", description: "", city: "London" }
    ]);
  });

  it("returns no records when the file contains only a header", () => {
    expect(parseCsv("name,country\n")).toEqual([]);
  });
});
