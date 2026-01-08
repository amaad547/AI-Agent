from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import os

app = Flask(__name__)
CORS(app)

client = Groq(api_key='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')

@app.route("/api/agent", methods=["POST"])
def agent():
    data = request.json
    prompt = data.get("prompt")

    if not prompt:
        return jsonify({"output": "No prompt provided"}), 400

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",  # ✅ WORKING MODEL
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4
        )

        return jsonify({
            "output": response.choices[0].message.content
        })

    except Exception as e:
        return jsonify({
            "output": f"AI Error: {str(e)}"
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
