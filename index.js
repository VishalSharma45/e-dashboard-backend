const express = require('express');
const cors = require('cors')
const User = require('./db/User');
const Product = require('./db/Product');

const Jwt = require("jsonwebtoken");
const jwtKey = 'e-comm';

require('./db/config');
const app = express();

app.use(express.json());
app.use(cors());

app.post("/register", async (req, res) => {
    try {
        let user = new User(req.body);
        let result = await user.save();
        result = result.toObject();
        // delete the password from response
        delete result.password;
        Jwt.sign({ result }, jwtKey, { expiresIn: "2h" }, (err, token) => {
            if (err) {
                res.send({ result: "something went wrong try after sometime" });
            } else {
                res.send({ result, auth: token });
            }
        });
    } catch (error) {
        console.error("Registration failed:", error);
        res.status(500).send({ error: "Registration failed. Please try again later." });
    }

});

app.post("/login", async (req, res) => {
    try {
        if (req.body.email && req.body.password) {
            let user = await User.findOne(req.body).select("-password");

            if (user) {
                Jwt.sign({ user }, jwtKey, { expiresIn: "2h" }, (err, token) => {
                    if (err) {
                        res.status(500).send({ error: "Something went wrong. Please try again later." });
                    } else {
                        res.status(200).send({ user, auth: token });
                    }
                });
            } else {
                res.status(404).send({ error: "No user found" });
            }
        } else {
            res.status(400).send({ error: "User and password are required" });
        }
    } catch (error) {
        console.error("Login failed:", error);
        res.status(500).send({ error: "Login failed. Please try again later." });
    }
});

app.post("/add-product", verifyToken, async (req, res) => {
    let product = new Product(req.body);
    let result = await product.save();
    res.send(result);
});

app.get("/products", verifyToken, async (req, res) => {
    let products = await Product.find();

    if (products.length > 0) {
        res.send(products);
    } else {
        res.send({ result: "No products found" });
    }
});

app.delete("/product/:id", verifyToken, async (req, res) => {
    const result = await Product.deleteOne({ _id: req.params.id });
    res.send(result);
});

app.get("/product/:id", verifyToken, async (req, res) => {
    let result = await Product.findOne({ _id: req.params.id });
    if (result) {
        res.send(result);
    } else {
        res.send(" result: No Result Found");
    }
});

app.put("/update/:id", verifyToken, async (req, res) => {
    let result = await Product.updateOne(
        { _id: req.params.id },
        {
            $set: req.body
        }
    )
    res.send(result);
});

app.get("/search/:key", verifyToken, async (req, res) => {
    let data = await Product.find({
        "$or": [
            { name: { $regex: req.params.key } },
            { price: { $regex: req.params.key } },
            { category: { $regex: req.params.key } },
            { company: { $regex: req.params.key } },
        ]
    })
    res.send(data)
});

function verifyToken(req, res, next) {
    let token = req.headers['authorization'];
    if (token) {
        token = token.split(' ')[1];
        Jwt.verify(token, jwtKey, (err, valid) => {
            if (err) {
                res.status(401).send({ result: "Please provide valid token" });
            } else {
                next();
            }
        })

    } else {
        res.status(403).send({ result: "Please add token with header" });
    }
}

app.listen(5500);