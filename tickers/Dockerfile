FROM python:3.12-slim

WORKDIR /app
COPY tickers/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY tickers/tickers_client.py ./tickers_client.py
COPY tickers/watchlist.yaml ./watchlist.yaml

CMD ["python", "tickers_client.py"]