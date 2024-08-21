const ExcelJS = require("exceljs");
const workbook = new ExcelJS.Workbook();
const { Container } = require("@nlpjs/core");
const { SentimentAnalyzer } = require("@nlpjs/sentiment");
const { LangId } = require("@nlpjs/lang-id");
const container = new Container();
container.use(LangId);

const cors = require('cors');

const express = require("express"),
  app = express(),
  port = 3000;
app.use(cors())
app.use(express.json());
async function readSentiment(text) {
  const sentiment = new SentimentAnalyzer({ container });
  const result = await sentiment.process({
    locale: "id",
    text,
  });
  return result.sentiment;
}

function countStar(reviews, score) {
  const count = score / reviews;
  const normalize = ((count + 1) / 2) * 4 + 1;
  return Number(normalize.toFixed(2));
}

app.get("/", async (req, res) => {
  try {
    const product = {};
    workbook.xlsx
      .readFile("review.xlsx")
      .then(async (row) => {
        const rows = row.worksheets[0].getColumn(3).worksheet;
        const length = 753;
        const nama = rows.getColumn(1).values,
          review = rows.getColumn(3).values;
        for (let index = 2; index <= length; index++) {
          const name = nama[index],
            reviews = await readSentiment(review[index]);
          if (!product[name]) {
            product[name] = {
              name,
              totalReviews: 1,
              totalScore: reviews.score < 0 ? -1 : 1,
              averageStar: countStar(1, reviews.score < 0 ? -1 : 1),
            };
          } else {
            product[name]["totalReviews"] = product[name]["totalReviews"] + 1;
            product[name]["totalScore"] += reviews.score < 0 ? -1 : 1;
          }
        }

        for (const [key, value] of Object.entries(product)) {
          product[key]["averageStar"] = countStar(
            value.totalReviews,
            value.totalScore
          );
          const query =
            "INSERT INTO produk (`kategori`, `nama_produk`, `totalScore`, `totalRating`, `averageStar`, `harga`, `stok`, `satuan`, `foto`, `deskripsi`) values ('Buah', ?, ?, ?, ?, 1000, 10, '/kg', 'semangka.jpg', ?)";
          connection.query(
            query,
            [
              value.name,
              value.totalScore,
              value.totalReviews,
              countStar(value.totalReviews, value.totalScore),
              value.name
            ],
            function (err, res) {
              if (err) {
                console.log(err);
              } else {
                console.log(res);
              }
            }
          );
        }

        return res.json({
          status: "success",
          product,
        });
      })
      .catch((err) => {
        return res.json({
          status: "failed",
          err,
        });
      });
  } catch (error) {
    return res.json({
      status: "failed",
      error,
    });
  }
});

app.post("/", async (req, res) => {
  try {
    const { arrReviews } = req.body;
    const arrReturn = []
    arrReviews.forEach(async (r, i) => {
      const totalReviews = r.totalReviews, totalScore = r.totalScore
      const sentiment = await readSentiment(r.reviewText);
      const totalScoreSum = totalScore + (sentiment.score < 0 ? -1 : 1);
      const product = {
        id:r.id,
        totalReviews: totalReviews + 1,
        totalScore: totalScoreSum,
        averageStar: countStar(totalReviews + 1, totalScoreSum),
        sentimentScore: sentiment,
      };
      arrReturn.push(product)
      if(i == arrReviews.length - 1) {
        return res.json({
          status: "success",
          arrReturn,
        });
      }
    });

  } catch (error) {
    return res.json({
      status: "failed",
      error,
    });
  }
});
app.listen(port, () => {
  console.log(`AI API Start on port ${port}`);
});
