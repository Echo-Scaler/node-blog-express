const http = require("http");

function checkPagination() {
  const url = "http://localhost:3000/api/posts?limit=5";
  http
    .get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          console.log("Response keys:", Object.keys(json));
          if (json.pagination) {
            console.log("Pagination Object:", json.pagination);
            if (json.pagination.page && json.pagination.total) {
              console.log(
                "PASS: Pagination object exists with required fields.",
              );
            } else {
              console.error("FAIL: Pagination object missing required fields.");
            }
          } else {
            console.error("FAIL: No pagination object found.");
          }
        } catch (e) {
          console.error("Error parsing JSON:", e);
        }
      });
    })
    .on("error", (err) => console.error("Request error:", err));
}

checkPagination();
