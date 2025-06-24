FROM tiangolo/uwsgi-nginx-flask:python3.10

COPY ./sbs_server /app
WORKDIR /app

RUN mkdir -p /app/data

ENV STATIC_PATH=/app/app/static

ENV LISTEN_PORT=5003
EXPOSE 5003

# Install requirements
COPY requirements.txt /app/
RUN /usr/local/bin/python -m pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Create uploads directory
RUN mkdir -p /app/uploads && \
    chown -R www-data:www-data /app/uploads && \
    chmod 755 /app/uploads